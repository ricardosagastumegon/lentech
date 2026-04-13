import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, BeforeInsert,
} from 'typeorm';
import { KYCLevel, KYCStatus, UserStatus, AMLRisk, Country } from '@mondega/shared-types';
import { generateId } from '@mondega/shared-utils';

@Entity('users')
@Index(['phoneNumber'], { unique: true })
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index(['referralCode'], { unique: true })
@Index(['status'])
@Index(['kycLevel'])
@Index(['country'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', unique: true })
  externalId!: string;  // e.g. "usr_a1b2c3..."

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber!: string;  // E.164 format

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'phone_verified_at', nullable: true, type: 'timestamptz' })
  phoneVerifiedAt?: Date;

  // Email is optional — many users only have phone
  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  // Names stored separately for privacy — can be null for anonymous users
  @Column({ name: 'first_name', nullable: true, length: 100 })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true, length: 100 })
  lastName?: string;

  @Column({ type: 'enum', enum: Country })
  country!: Country;

  // PIN stored as argon2 hash — never plaintext
  @Column({ name: 'pin_hash', length: 255 })
  pinHash!: string;

  @Column({ name: 'pin_failed_attempts', default: 0 })
  pinFailedAttempts!: number;

  @Column({ name: 'pin_locked_until', nullable: true, type: 'timestamptz' })
  pinLockedUntil?: Date;

  @Column({
    name: 'kyc_level',
    type: 'enum',
    enum: KYCLevel,
    default: KYCLevel.ANONYMOUS,
  })
  kycLevel!: KYCLevel;

  @Column({
    name: 'kyc_status',
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  kycStatus!: KYCStatus;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_KYC,
  })
  status!: UserStatus;

  @Column({
    name: 'aml_risk',
    type: 'enum',
    enum: AMLRisk,
    default: AMLRisk.LOW,
  })
  amlRisk!: AMLRisk;

  @Column({ name: 'referral_code', length: 20, unique: true })
  referralCode!: string;

  @Column({ name: 'referred_by', nullable: true, length: 20 })
  referredBy?: string;

  // Device fingerprints for fraud detection (array of known devices)
  @Column({ name: 'known_devices', type: 'jsonb', default: [] })
  knownDevices!: object[];

  // Soft delete — we never hard-delete user records (regulatory requirement)
  @Column({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', nullable: true, length: 45 })
  lastLoginIP?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  setExternalId() {
    if (!this.externalId) {
      this.externalId = generateId('usr');
    }
  }

  // Helper: full name for notifications
  get displayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) return this.firstName;
    // Anonymous users identified by phone suffix
    return `User ···${this.phoneNumber.slice(-4)}`;
  }

  // Helper: check if PIN is locked
  get isPINLocked(): boolean {
    if (!this.pinLockedUntil) return false;
    return this.pinLockedUntil > new Date();
  }
}
