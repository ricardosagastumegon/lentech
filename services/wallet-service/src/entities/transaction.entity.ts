import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { TransactionType, TransactionStatus } from '@mondega/shared-types';

@Entity('transactions')
@Index(['fromUserId', 'createdAt'])
@Index(['toUserId', 'createdAt'])
@Index(['status'])
@Index(['txHash'], { unique: true, where: '"tx_hash" IS NOT NULL' })
@Index(['type'])
export class TransactionEntity {
  @PrimaryColumn({ length: 100 })
  id!: string;  // tx_...

  @Column({ name: 'tx_hash', nullable: true, length: 66 })
  txHash?: string;  // Blockchain tx hash

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ name: 'from_user_id', nullable: true, length: 100 })
  fromUserId?: string;

  @Column({ name: 'to_user_id', nullable: true, length: 100 })
  toUserId?: string;

  @Column({ name: 'from_wallet_address', nullable: true, length: 42 })
  fromWalletAddress?: string;

  @Column({ name: 'to_wallet_address', nullable: true, length: 42 })
  toWalletAddress?: string;

  @Column({ name: 'amount_mondg', type: 'numeric', precision: 78, scale: 0 })
  amountMondg!: string;

  @Column({ name: 'fee_mondg', type: 'numeric', precision: 78, scale: 0, default: '0' })
  feeMondg!: string;

  // Fiat snapshot at time of transaction (for audit/display)
  @Column({ name: 'amount_fiat', nullable: true, type: 'numeric', precision: 20, scale: 4 })
  amountFiat?: string;

  @Column({ name: 'fiat_currency', nullable: true, length: 10 })
  fiatCurrency?: string;

  @Column({ name: 'fx_rate', nullable: true, type: 'numeric', precision: 20, scale: 8 })
  fxRate?: string;

  @Column({ nullable: true, length: 500 })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'block_number', nullable: true })
  blockNumber?: number;

  @Column({ default: 0 })
  confirmations!: number;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt?: Date;

  @Column({ name: 'failed_reason', nullable: true, length: 500 })
  failedReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
