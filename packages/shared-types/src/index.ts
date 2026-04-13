// ============================================================
// MONDEGA DIGITAL — Shared Domain Types
// Used across all services and apps
// ============================================================

// ---- Enums ----

export enum KYCLevel {
  ANONYMOUS = 0,
  BASIC = 1,
  VERIFIED = 2,
  BUSINESS = 3,
}

export enum KYCStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum TransactionType {
  PURCHASE = 'purchase',       // User buys MONDG tokens
  SALE = 'sale',               // User sells MONDG tokens
  TRANSFER = 'transfer',       // P2P transfer between users
  FIAT_LOAD = 'fiat_load',     // Load from bank/card
  FIAT_WITHDRAW = 'fiat_withdraw', // Withdraw to bank
  FX_SWAP = 'fx_swap',         // Cross-currency swap
  FEE = 'fee',                 // Commission deducted
  REFUND = 'refund',           // Refund to user
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMING = 'confirming',   // Waiting for blockchain confirmation
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum Currency {
  MONDG = 'MONDG',   // Mondega token (native)
  GTQ = 'GTQ',       // Guatemalan Quetzal
  MXN = 'MXN',       // Mexican Peso
  USD = 'USD',       // US Dollar
  HNL = 'HNL',       // Honduran Lempira
  NIO = 'NIO',       // Nicaraguan Córdoba
  CRC = 'CRC',       // Costa Rican Colón
  BZD = 'BZD',       // Belize Dollar
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
  PENDING_KYC = 'pending_kyc',
}

export enum NotificationType {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum AMLRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FiatProvider {
  BANRURAL = 'banrural',
  BAM = 'bam',
  GT_CONTINENTAL = 'gt_continental',
  CODI = 'codi',
  SPEI = 'spei',
  OXXO = 'oxxo',
  CARD_VISA = 'card_visa',
  CARD_MASTERCARD = 'card_mastercard',
}

export enum Country {
  GT = 'GT',  // Guatemala
  MX = 'MX',  // Mexico
  HN = 'HN',  // Honduras
  SV = 'SV',  // El Salvador
  NI = 'NI',  // Nicaragua
  CR = 'CR',  // Costa Rica
  BZ = 'BZ',  // Belize
  US = 'US',  // United States
}

// ---- Core Entities ----

export interface User {
  id: string;
  phoneNumber: string;
  phoneVerified: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  country: Country;
  kycLevel: KYCLevel;
  kycStatus: KYCStatus;
  status: UserStatus;
  amlRisk: AMLRisk;
  referralCode: string;
  referredBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  address: string;           // Polygon wallet address
  balanceMondg: string;      // BigInt as string (wei-like precision)
  balanceReservedMondg: string; // Locked in pending transactions
  totalReceivedMondg: string;
  totalSentMondg: string;
  transactionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  txHash?: string;           // Blockchain tx hash when confirmed
  type: TransactionType;
  status: TransactionStatus;
  fromUserId?: string;
  toUserId?: string;
  fromWalletAddress?: string;
  toWalletAddress?: string;
  amountMondg: string;       // In MONDG (18 decimals as string)
  amountFiat?: string;       // Fiat equivalent at time of tx
  fiatCurrency?: Currency;
  feeMondg: string;          // Fee charged in MONDG
  fxRate?: string;           // Exchange rate used
  description?: string;
  metadata?: Record<string, unknown>;
  blockNumber?: number;
  confirmations: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface FXRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: string;              // Precise decimal as string
  sourceRate: string;        // Oracle rate before spread
  spread: string;            // Our spread applied
  provider: string;
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
}

export interface KYCDocument {
  id: string;
  userId: string;
  type: 'national_id' | 'passport' | 'drivers_license' | 'utility_bill' | 'selfie';
  country: Country;
  fileKey: string;           // S3 key (never exposed to client)
  status: KYCStatus;
  verificationProvider: string;
  externalId?: string;       // Provider's document ID
  rejectionReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AMLAlert {
  id: string;
  userId: string;
  transactionId?: string;
  riskLevel: AMLRisk;
  ruleTriggered: string;
  description: string;
  status: 'open' | 'investigating' | 'cleared' | 'reported';
  assignedTo?: string;
  reportedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface FiatTransaction {
  id: string;
  userId: string;
  mondegaTxId?: string;
  provider: FiatProvider;
  externalReference: string; // Provider's reference
  type: 'load' | 'withdraw';
  amount: string;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  webhookReceived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- API Response Wrappers ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---- DTOs ----

export interface RegisterDTO {
  phoneNumber: string;       // E.164 format (+50212345678)
  country: Country;
  pin: string;               // 6 digits, hashed before storage
  referralCode?: string;
}

export interface VerifyPhoneDTO {
  phoneNumber: string;
  otp: string;               // 6-digit SMS code
}

export interface SendTokensDTO {
  toIdentifier: string;      // Phone number, username, or wallet address
  amountMondg: string;
  description?: string;
  pin: string;               // Require PIN for every send
}

export interface BuyTokensDTO {
  amountFiat: string;
  fiatCurrency: Currency;
  fiatProvider: FiatProvider;
  pin: string;
}

export interface FXQuoteDTO {
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: string;
  direction: 'from' | 'to';  // 'from': I have X, how much do I get? 'to': I want X, how much do I pay?
}

export interface FXQuoteResponse {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  toAmount: string;
  rate: string;
  fee: string;
  feePercentage: string;
  validUntil: Date;
  quoteId: string;           // Must be used within 30 seconds to lock rate
}

// ---- Events (Kafka topics) ----

export interface UserRegisteredEvent {
  userId: string;
  phoneNumber: string;
  country: Country;
  timestamp: Date;
}

export interface TransactionCreatedEvent {
  transactionId: string;
  type: TransactionType;
  fromUserId?: string;
  toUserId?: string;
  amountMondg: string;
  timestamp: Date;
}

export interface TransactionCompletedEvent {
  transactionId: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
}

export interface KYCApprovedEvent {
  userId: string;
  newKycLevel: KYCLevel;
  timestamp: Date;
}

export interface AMLAlertCreatedEvent {
  alertId: string;
  userId: string;
  transactionId?: string;
  riskLevel: AMLRisk;
  timestamp: Date;
}

// ---- Limits by KYC Level ----

export const KYC_LIMITS: Record<KYCLevel, {
  monthlyLimitUSD: number;
  singleTxLimitUSD: number;
  requiresKYC: string[];
}> = {
  [KYCLevel.ANONYMOUS]: {
    monthlyLimitUSD: 200,
    singleTxLimitUSD: 50,
    requiresKYC: [],
  },
  [KYCLevel.BASIC]: {
    monthlyLimitUSD: 1000,
    singleTxLimitUSD: 200,
    requiresKYC: ['phone', 'photo_id'],
  },
  [KYCLevel.VERIFIED]: {
    monthlyLimitUSD: 10000,
    singleTxLimitUSD: 2000,
    requiresKYC: ['phone', 'photo_id', 'selfie', 'address'],
  },
  [KYCLevel.BUSINESS]: {
    monthlyLimitUSD: 1000000,
    singleTxLimitUSD: 100000,
    requiresKYC: ['phone', 'photo_id', 'selfie', 'address', 'business_registration', 'tax_id'],
  },
};

// ---- Fee Schedule ----

export const FEE_SCHEDULE = {
  purchase: 0.005,       // 0.5% to buy MONDG
  sale: 0.005,           // 0.5% to sell MONDG
  transfer: 0.003,       // 0.3% P2P
  remittance: 0.006,     // 0.6% cross-border remittance
  b2b: 0.008,            // 0.8% B2B commercial
  fiat_load_bank: 0.000, // Free via bank transfer
  fiat_load_card: 0.015, // 1.5% via debit/credit card
  fiat_load_cash: 0.010, // 1.0% via cash agents (OXXO etc)
} as const;

// ---- Supported Currency Pairs ----

export const SUPPORTED_PAIRS: Array<[Currency, Currency]> = [
  [Currency.GTQ, Currency.MONDG],
  [Currency.MXN, Currency.MONDG],
  [Currency.USD, Currency.MONDG],
  [Currency.HNL, Currency.MONDG],
  [Currency.NIO, Currency.MONDG],
  [Currency.CRC, Currency.MONDG],
  [Currency.GTQ, Currency.MXN],
  [Currency.GTQ, Currency.USD],
  [Currency.MXN, Currency.USD],
  [Currency.HNL, Currency.GTQ],
  [Currency.HNL, Currency.MXN],
];
