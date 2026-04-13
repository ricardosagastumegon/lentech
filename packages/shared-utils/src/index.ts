// ============================================================
// MONDEGA DIGITAL — Shared Utilities
// ============================================================

import crypto from 'crypto';
import { Currency, FEE_SCHEDULE } from '@mondega/shared-types';

// ---- Cryptography ----

const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] ?? '';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts sensitive data (PII, documents).
 * Uses AES-256-GCM with random IV per encryption.
 */
export function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts data encrypted with the encrypt() function.
 */
export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a 6-digit OTP for SMS verification.
 */
export function generateOTP(): string {
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString();
}

/**
 * Creates an HMAC-SHA256 signature for webhook verification.
 */
export function signWebhook(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies a webhook signature in constant time (prevents timing attacks).
 */
export function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = signWebhook(payload, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature.replace('sha256=', ''), 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Hash sensitive data for comparison (not for passwords - use argon2 for that).
 */
export function hashSensitive(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ---- Amount / BigInt Math ----

const MONDG_DECIMALS = 18n;
const MONDG_UNIT = 10n ** MONDG_DECIMALS; // 1 MONDG = 1e18 units

/**
 * Convert human-readable MONDG amount to internal units (BigInt).
 * E.g. "1.5" -> 1500000000000000000n
 */
export function toMondgUnits(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  return BigInt(whole ?? '0') * MONDG_UNIT + BigInt(paddedFraction);
}

/**
 * Convert internal MONDG units to human-readable string.
 * E.g. 1500000000000000000n -> "1.500000000000000000"
 */
export function fromMondgUnits(units: bigint, decimals: number = 6): string {
  const divisor = MONDG_UNIT;
  const whole = units / divisor;
  const fraction = units % divisor;
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, decimals);
  return `${whole}.${fractionStr}`;
}

/**
 * Apply fee to an amount. Returns { net, fee } both in MONDG units.
 */
export function applyFee(
  amountUnits: bigint,
  feeType: keyof typeof FEE_SCHEDULE,
): { net: bigint; fee: bigint } {
  const feeRate = FEE_SCHEDULE[feeType];
  const feeBps = BigInt(Math.round(feeRate * 10000)); // Convert to basis points
  const fee = (amountUnits * feeBps) / 10000n;
  const net = amountUnits - fee;
  return { net, fee };
}

/**
 * Safe addition preventing overflow.
 */
export function safeAdd(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

/**
 * Safe subtraction preventing underflow.
 */
export function safeSub(a: string, b: string): string {
  const result = BigInt(a) - BigInt(b);
  if (result < 0n) throw new Error('Insufficient balance');
  return result.toString();
}

// ---- Validation ----

/**
 * Validates E.164 phone number format.
 * E.g. +50212345678 (Guatemala), +5215512345678 (Mexico)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/**
 * Validates a 6-digit PIN.
 */
export function isValidPIN(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Validates an Ethereum/Polygon wallet address.
 */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validates a positive decimal amount string.
 * E.g. "100.50" is valid, "-5" and "abc" are not.
 */
export function isValidAmount(amount: string): boolean {
  if (!/^\d+(\.\d{1,18})?$/.test(amount)) return false;
  const num = parseFloat(amount);
  return num > 0 && isFinite(num);
}

/**
 * Sanitizes user input to prevent injection attacks.
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>'"&]/g, '');
}

// ---- Formatting ----

/**
 * Formats a MONDG amount for display.
 * E.g. "1247.500000" -> "1,247.50 ₳"
 */
export function formatMondg(amount: string, decimals: number = 2): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '₳ 0.00';
  return `₳ ${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats a fiat amount for display.
 */
export function formatFiat(amount: string, currency: Currency): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  const symbols: Partial<Record<Currency, string>> = {
    [Currency.GTQ]: 'Q',
    [Currency.MXN]: '$',
    [Currency.USD]: '$',
    [Currency.HNL]: 'L',
    [Currency.NIO]: 'C$',
    [Currency.CRC]: '₡',
  };
  const symbol = symbols[currency] ?? '';
  return `${symbol} ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/**
 * Truncates a wallet address for display.
 * E.g. "0x1234...5678"
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Truncates a transaction hash for display.
 */
export function truncateTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

// ---- Rate Limiting ----

/**
 * Generates a Redis key for rate limiting.
 */
export function rateLimitKey(identifier: string, action: string): string {
  return `ratelimit:${action}:${hashSensitive(identifier)}`;
}

// ---- Date Utilities ----

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

// ---- ID Generation ----

/**
 * Generates a prefixed unique ID.
 * E.g. "tx_a1b2c3d4e5f6..." for transactions
 */
export function generateId(prefix: string): string {
  return `${prefix}_${generateSecureToken(16)}`;
}
