// ============================================================
// LEN — Virtual Bank Account Entity
// Each user gets a dedicated virtual account per country.
// Deposits to this account auto-credit the user's wallet.
// ============================================================

import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type VirtualAccountCountry = 'GT' | 'MX' | 'HN';
export type VirtualAccountStatus  = 'active' | 'suspended' | 'closed';

@Entity('virtual_accounts')
@Index(['userId', 'country'], { unique: true })   // one account per user per country
@Index(['accountReference'], { unique: true })     // unique routing reference
@Index(['clabe'], { unique: true, sparse: true })  // MX only
export class VirtualAccount {
  @PrimaryColumn({ length: 60 })
  id!: string; // va_{country}_{userId_short}_{rand}

  // ── User link ────────────────────────────────────────────
  @Column({ name: 'user_id', length: 100 })
  userId!: string;

  @Column({ length: 2 })
  country!: VirtualAccountCountry;  // GT | MX | HN

  // ── Bank routing ─────────────────────────────────────────
  @Column({ name: 'account_reference', length: 30 })
  accountReference!: string;
  // GT/HN: 8-char numeric reference user puts in transfer concept
  // MX:    18-digit CLABE virtual (routes directly to this account)

  @Column({ nullable: true, length: 18 })
  clabe?: string;             // MX only — 18-digit CLABE interbancaria

  @Column({ name: 'pool_account', length: 30 })
  poolAccount!: string;
  // The LEN master account at the bank that receives all deposits
  // GT: Banrural account 3010-XXXX-LEN
  // MX: STP/Conekta CLABE 646180XXXXXXXXXX
  // HN: Atlántida account 3090-XXXX-LEN

  @Column({ name: 'bank_code', length: 20 })
  bankCode!: string;          // BANRURAL | STP | BAC_HN | ATLANTIDA

  // ── Balance tracking ─────────────────────────────────────
  @Column({ name: 'total_deposited', type: 'numeric', precision: 20, scale: 4, default: '0' })
  totalDeposited!: string;    // lifetime fiat deposited (informational)

  @Column({ name: 'total_withdrawn', type: 'numeric', precision: 20, scale: 4, default: '0' })
  totalWithdrawn!: string;

  // ── Status ───────────────────────────────────────────────
  @Column({ length: 20, default: 'active' })
  status!: VirtualAccountStatus;

  @Column({ name: 'kyc_level_required', default: 1 })
  kycLevelRequired!: number;  // minimum KYC to use this account

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
