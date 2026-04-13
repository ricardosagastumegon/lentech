import {
  Injectable, Logger, UnauthorizedException, ConflictException,
  BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { User } from '../users/entities/user.entity';
import { Session } from './entities/session.entity';
import { OTPCode } from './entities/otp-code.entity';
import { RegisterDTO } from './dto/register.dto';
import { VerifyPhoneDTO } from './dto/verify-phone.dto';
import { LoginDTO } from './dto/login.dto';
import { ChangePINDTO } from './dto/change-pin.dto';
import { Enable2FADTO } from './dto/enable-2fa.dto';
import {
  generateOTP, generateSecureToken, generateId,
  addMinutes, addDays, isExpired, encrypt, decrypt, hashSensitive,
} from '@mondega/shared-utils';
import { KYCLevel, UserStatus, Country } from '@mondega/shared-types';

// Argon2id configuration — OWASP recommended settings
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,        // 3 iterations
  parallelism: 4,     // 4 threads
};

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 30;
const OTP_EXPIRY_MINUTES = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(OTPCode)
    private readonly otpRepo: Repository<OTPCode>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  // ---- Registration ----

  async register(dto: RegisterDTO, ip: string, userAgent: string) {
    // Check if phone already registered
    const existing = await this.userRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      // Don't reveal whether account exists — security measure
      // Just say OTP was sent (we don't send one)
      this.logger.warn(`Registration attempt for existing phone: ${dto.phoneNumber} from ${ip}`);
      return { message: 'If this number is new, you will receive an OTP.' };
    }

    // Hash PIN with argon2id
    const pinHash = await argon2.hash(dto.pin, ARGON2_OPTIONS);

    // Create user
    const user = this.userRepo.create({
      externalId: generateId('usr'),
      phoneNumber: dto.phoneNumber,
      country: dto.country as Country,
      pinHash,
      kycLevel: KYCLevel.ANONYMOUS,
      status: UserStatus.PENDING_KYC,
      referralCode: await this.generateUniqueReferralCode(),
      referredBy: dto.referralCode,
      lastLoginIP: ip,
    });

    await this.userRepo.save(user);
    this.logger.log(`New user registered: ${user.externalId} from ${dto.country}`);

    // Send OTP
    await this.sendOTP(dto.phoneNumber, 'verification');

    // Emit user registered event to Kafka (async)
    await this.notificationQueue.add('user-registered', {
      userId: user.externalId,
      phoneNumber: user.phoneNumber,
      country: user.country,
    });

    return {
      message: 'Registration successful. Please verify your phone number.',
      userId: user.externalId,
    };
  }

  // ---- Phone Verification ----

  async verifyPhone(dto: VerifyPhoneDTO) {
    const user = await this.findUserByPhone(dto.phoneNumber);

    // Validate OTP
    await this.validateOTP(dto.phoneNumber, dto.otp, 'verification');

    // Mark phone verified and activate account
    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    user.status = UserStatus.ACTIVE;
    await this.userRepo.save(user);

    this.logger.log(`Phone verified for user: ${user.externalId}`);

    // Return initial tokens so user is logged in immediately after verification
    return this.issueTokens(user);
  }

  // ---- Login ----

  async login(dto: LoginDTO, ip: string, userAgent: string) {
    const user = await this.findUserByPhone(dto.phoneNumber);

    // Check account status
    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked. Contact support.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is temporarily suspended.');
    }

    if (!user.phoneVerified) {
      throw new UnauthorizedException('Phone number not verified.');
    }

    // Check PIN lockout
    if (user.isPINLocked) {
      const minutesLeft = Math.ceil(
        ((user.pinLockedUntil?.getTime() ?? 0) - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutesLeft} minutes.`,
      );
    }

    // Verify PIN
    const pinValid = await argon2.verify(user.pinHash, dto.pin);
    if (!pinValid) {
      await this.handleFailedPINAttempt(user);
      throw new UnauthorizedException('Invalid PIN.');
    }

    // Reset failed attempts on success
    user.pinFailedAttempts = 0;
    user.pinLockedUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIP = ip;
    await this.userRepo.save(user);

    this.logger.log(`User logged in: ${user.externalId} from ${ip}`);

    return this.issueTokens(user, userAgent, ip);
  }

  // ---- Token Management ----

  private async issueTokens(user: User, userAgent?: string, ip?: string) {
    const sessionId = generateId('ses');
    const refreshToken = generateSecureToken(48);

    // Create session record — tokenIndex enables O(1) refresh lookup
    const session = this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: await argon2.hash(refreshToken, ARGON2_OPTIONS),
      tokenIndex: hashSensitive(refreshToken),
      userAgent: userAgent ?? 'unknown',
      ipAddress: ip ?? 'unknown',
      expiresAt: addDays(new Date(), 7),
    });
    await this.sessionRepo.save(session);

    // Sign access token (short-lived, 15 min)
    const accessToken = this.jwtService.sign(
      {
        sub: user.externalId,
        sessionId,
        kycLevel: user.kycLevel,
        country: user.country,
        status: user.status,
      },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(token: string) {
    // Fast lookup: use SHA-256 index on token (hashed for O(1) DB lookup).
    // The argon2 hash stored is for security; we index a fast SHA-256 digest
    // that maps to the session row, then verify the argon2 hash for auth.
    const { hashSensitive } = await import('@mondega/shared-utils');
    const tokenIndex = hashSensitive(token);

    const matchedSession = await this.sessionRepo.findOne({
      where: { tokenIndex, isRevoked: false },
    });

    if (!matchedSession || isExpired(matchedSession.expiresAt)) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Verify argon2 hash (security layer — confirms token is genuine)
    const valid = await argon2.verify(matchedSession.refreshTokenHash, token);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.userRepo.findOneBy({ id: matchedSession.userId });
    if (!user) throw new UnauthorizedException('User not found.');

    // Rotate refresh token (security best practice — old token invalid immediately)
    const newRefreshToken = generateSecureToken(48);
    matchedSession.refreshTokenHash = await argon2.hash(newRefreshToken, ARGON2_OPTIONS);
    matchedSession.tokenIndex = hashSensitive(newRefreshToken); // update O(1) index
    matchedSession.expiresAt = addDays(new Date(), 7);
    await this.sessionRepo.save(matchedSession);

    const accessToken = this.jwtService.sign(
      {
        sub: user.externalId,
        sessionId: matchedSession.id,
        kycLevel: user.kycLevel,
        country: user.country,
        status: user.status,
      },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
  }

  async logout(user: { sessionId: string }) {
    await this.sessionRepo.update(
      { id: user.sessionId },
      { isRevoked: true, revokedAt: new Date() },
    );
    return { message: 'Logged out successfully.' };
  }

  // ---- 2FA ----

  async enable2FA(userId: string, _dto: Enable2FADTO) {
    const user = await this.findUserById(userId);

    const secret = speakeasy.generateSecret({
      name: `Mondega (${user.phoneNumber})`,
      issuer: 'Mondega Digital',
    });

    // Encrypt 2FA secret before storing — never in plaintext
    const encryptedSecret = encrypt(secret.base32);
    user.knownDevices = [
      ...user.knownDevices,
      { type: '2fa_pending', secret: encryptedSecret },
    ];
    await this.userRepo.save(user);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url ?? '');

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan QR code with your authenticator app, then call /auth/2fa/verify',
    };
  }

  async verify2FA(userId: string, code: string) {
    const user = await this.findUserById(userId);
    const pendingDevice = (user.knownDevices as Array<{type: string; secret: string}>)
      .find(d => d.type === '2fa_pending');

    if (!pendingDevice) {
      throw new BadRequestException('No pending 2FA setup found.');
    }

    // Decrypt secret for TOTP verification
    const decryptedSecret = decrypt(pendingDevice.secret);
    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time-steps drift
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    // Confirm 2FA setup — keep secret encrypted
    user.knownDevices = (user.knownDevices as Array<{type: string; secret: string}>)
      .map(d => d.type === '2fa_pending' ? { type: '2fa_totp', secret: d.secret } : d);
    await this.userRepo.save(user);

    return { message: '2FA enabled successfully.' };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.findUserById(userId);
    const totpDevice = (user.knownDevices as Array<{type: string; secret: string}>)
      .find(d => d.type === '2fa_totp');

    if (!totpDevice) {
      throw new BadRequestException('2FA is not enabled.');
    }

    const decryptedDisableSecret = decrypt(totpDevice.secret);
    const isValid = speakeasy.totp.verify({
      secret: decryptedDisableSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) throw new UnauthorizedException('Invalid 2FA code.');

    user.knownDevices = (user.knownDevices as Array<{type: string}>)
      .filter(d => d.type !== '2fa_totp');
    await this.userRepo.save(user);

    return { message: '2FA disabled.' };
  }

  // ---- PIN Management ----

  async changePIN(userId: string, dto: ChangePINDTO) {
    const user = await this.findUserById(userId);

    const currentValid = await argon2.verify(user.pinHash, dto.currentPin);
    if (!currentValid) throw new UnauthorizedException('Current PIN is incorrect.');

    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException('New PIN must be different from current PIN.');
    }

    user.pinHash = await argon2.hash(dto.newPin, ARGON2_OPTIONS);
    user.pinFailedAttempts = 0;
    user.pinLockedUntil = undefined;
    await this.userRepo.save(user);

    // Revoke all other sessions for security
    await this.sessionRepo.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    return { message: 'PIN changed. Please login again.' };
  }

  async requestPINReset(phoneNumber: string) {
    // Always return same message to prevent user enumeration
    try {
      await this.findUserByPhone(phoneNumber);
      await this.sendOTP(phoneNumber, 'pin_reset');
    } catch {}
    return { message: 'If this number is registered, you will receive an OTP.' };
  }

  async confirmPINReset(body: { phoneNumber: string; otp: string; newPin: string }) {
    const user = await this.findUserByPhone(body.phoneNumber);
    await this.validateOTP(body.phoneNumber, body.otp, 'pin_reset');

    user.pinHash = await argon2.hash(body.newPin, ARGON2_OPTIONS);
    user.pinFailedAttempts = 0;
    user.pinLockedUntil = undefined;
    await this.userRepo.save(user);

    // Revoke all sessions
    await this.sessionRepo.update(
      { userId: user.id },
      { isRevoked: true, revokedAt: new Date() },
    );

    return { message: 'PIN reset successful. Please login with your new PIN.' };
  }

  // ---- Session Management ----

  async getMe(userId: string) {
    const user = await this.findUserById(userId);
    return this.sanitizeUser(user);
  }

  async getSessions(userId: string) {
    const user = await this.findUserById(userId);
    const sessions = await this.sessionRepo.find({
      where: { userId: user.id, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
    return sessions.map(s => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeAllSessions(userId: string, currentSessionId: string) {
    const user = await this.findUserById(userId);
    // Revoke all except current session
    const sessions = await this.sessionRepo.find({
      where: { userId: user.id, isRevoked: false },
    });
    const toRevoke = sessions.filter(s => s.id !== currentSessionId);
    for (const session of toRevoke) {
      session.isRevoked = true;
      session.revokedAt = new Date();
    }
    await this.sessionRepo.save(toRevoke);
    return { revokedCount: toRevoke.length };
  }

  // ---- OTP Helpers ----

  private async sendOTP(phoneNumber: string, type: string) {
    // Invalidate previous OTPs of same type
    await this.otpRepo.update(
      { phoneNumber, type, used: false },
      { used: true },
    );

    const code = generateOTP();
    const otp = this.otpRepo.create({
      phoneNumber,
      code: await argon2.hash(code, ARGON2_OPTIONS),
      type,
      expiresAt: addMinutes(new Date(), OTP_EXPIRY_MINUTES),
    });
    await this.otpRepo.save(otp);

    // Queue SMS send
    await this.notificationQueue.add('send-sms', {
      to: phoneNumber,
      message: `Your Mondega verification code is: ${code}. Expires in ${OTP_EXPIRY_MINUTES} minutes. Never share this code.`,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    this.logger.log(`OTP sent to ${phoneNumber.slice(0, 6)}...`);
  }

  async resendOTP(phoneNumber: string) {
    try {
      await this.findUserByPhone(phoneNumber);
    } catch {}
    await this.sendOTP(phoneNumber, 'verification');
    return { message: 'OTP resent.' };
  }

  private async validateOTP(phoneNumber: string, code: string, type: string) {
    const otps = await this.otpRepo.find({
      where: { phoneNumber, type, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!otps.length) {
      throw new BadRequestException('No valid OTP found. Please request a new one.');
    }

    const otp = otps[0]!;

    if (isExpired(otp.expiresAt)) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const isValid = await argon2.verify(otp.code, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    // Mark as used
    otp.used = true;
    await this.otpRepo.save(otp);
  }

  // ---- Helpers ----

  private async handleFailedPINAttempt(user: User) {
    user.pinFailedAttempts += 1;
    if (user.pinFailedAttempts >= MAX_PIN_ATTEMPTS) {
      user.pinLockedUntil = addMinutes(new Date(), PIN_LOCK_MINUTES);
      user.pinFailedAttempts = 0;
      this.logger.warn(`User ${user.externalId} PIN locked after ${MAX_PIN_ATTEMPTS} failed attempts`);
    }
    await this.userRepo.save(user);
  }

  private async findUserByPhone(phoneNumber: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { phoneNumber } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async findUserById(externalId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { externalId } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private sanitizeUser(user: User) {
    return {
      id: user.externalId,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      country: user.country,
      kycLevel: user.kycLevel,
      kycStatus: user.kycStatus,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let exists: User | null;
    do {
      code = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('');
      exists = await this.userRepo.findOne({ where: { referralCode: code } });
    } while (exists);
    return code!;
  }
}
