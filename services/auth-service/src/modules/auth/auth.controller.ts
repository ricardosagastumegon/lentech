import {
  Controller, Post, Get, Body, Req, Res, HttpCode,
  HttpStatus, UseGuards, Headers, Ip,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RegisterDTO } from './dto/register.dto';
import { VerifyPhoneDTO } from './dto/verify-phone.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { Enable2FADTO } from './dto/enable-2fa.dto';
import { Verify2FADTO } from './dto/verify-2fa.dto';
import { ChangePINDTO } from './dto/change-pin.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---- Registration ----

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3600 } }) // 5 registrations per IP per hour
  @ApiOperation({ summary: 'Register new user with phone number' })
  @ApiResponse({ status: 201, description: 'User registered. OTP sent via SMS.' })
  @ApiResponse({ status: 409, description: 'Phone number already registered.' })
  async register(
    @Body() dto: RegisterDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.register(dto, ip, userAgent);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600 } }) // 10 OTP attempts per hour
  @ApiOperation({ summary: 'Verify phone with OTP received via SMS' })
  async verifyPhone(@Body() dto: VerifyPhoneDTO) {
    return this.authService.verifyPhone(dto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600 } }) // 3 resends per hour
  @ApiOperation({ summary: 'Resend OTP SMS' })
  async resendOTP(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.resendOTP(phoneNumber);
  }

  // ---- Login ----

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900 } }) // 10 attempts per 15 min
  @ApiOperation({ summary: 'Login with phone number and PIN' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns JWT tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 423, description: 'Account locked after too many failed attempts.' })
  async login(
    @Body() dto: LoginDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  async logout(@Req() req: Request) {
    return this.authService.logout(req.user as { sessionId: string });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 3600 } })
  @ApiOperation({ summary: 'Refresh JWT access token using refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDTO) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ---- Two-Factor Authentication ----

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable TOTP-based 2FA. Returns QR code.' })
  async enable2FA(
    @Req() req: Request,
    @Body() dto: Enable2FADTO,
  ) {
    return this.authService.enable2FA(
      (req.user as { userId: string }).userId,
      dto,
    );
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code to complete 2FA setup' })
  async verify2FA(
    @Req() req: Request,
    @Body() dto: Verify2FADTO,
  ) {
    return this.authService.verify2FA(
      (req.user as { userId: string }).userId,
      dto.code,
    );
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (requires current PIN + 2FA code)' })
  async disable2FA(
    @Req() req: Request,
    @Body() dto: Verify2FADTO,
  ) {
    return this.authService.disable2FA(
      (req.user as { userId: string }).userId,
      dto.code,
    );
  }

  // ---- PIN Management ----

  @Post('pin/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 3600 } })
  @ApiOperation({ summary: 'Change account PIN' })
  async changePIN(
    @Req() req: Request,
    @Body() dto: ChangePINDTO,
  ) {
    return this.authService.changePIN(
      (req.user as { userId: string }).userId,
      dto,
    );
  }

  @Post('pin/reset/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600 } })
  @ApiOperation({ summary: 'Request PIN reset via SMS OTP' })
  async requestPINReset(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.requestPINReset(phoneNumber);
  }

  @Post('pin/reset/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600 } })
  @ApiOperation({ summary: 'Confirm PIN reset with OTP and set new PIN' })
  async confirmPINReset(@Body() body: {
    phoneNumber: string;
    otp: string;
    newPin: string;
  }) {
    return this.authService.confirmPINReset(body);
  }

  // ---- Session Info ----

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@Req() req: Request) {
    return this.authService.getMe((req.user as { userId: string }).userId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions for current user' })
  async getSessions(@Req() req: Request) {
    return this.authService.getSessions((req.user as { userId: string }).userId);
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except current (security lockout)' })
  async revokeAllSessions(@Req() req: Request) {
    return this.authService.revokeAllSessions(
      (req.user as { userId: string; sessionId: string }).userId,
      (req.user as { userId: string; sessionId: string }).sessionId,
    );
  }
}
