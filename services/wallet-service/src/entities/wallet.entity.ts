import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('wallets')
@Index(['userId'], { unique: true })
@Index(['address'], { unique: true })
@Index(['isActive'])
export class WalletEntity {
  @PrimaryColumn({ length: 100 })
  id!: string;  // wal_...

  @Column({ name: 'user_id', length: 100 })
  userId!: string;

  @Column({ length: 42 })
  address!: string;  // 0x... Polygon address

  // Balances stored as BigInt strings (wei-like precision, 18 decimals)
  @Column({ name: 'balance_mondg', type: 'numeric', precision: 78, scale: 0, default: '0' })
  balanceMondg!: string;

  @Column({ name: 'balance_reserved_mondg', type: 'numeric', precision: 78, scale: 0, default: '0' })
  balanceReservedMondg!: string;

  @Column({ name: 'total_received_mondg', type: 'numeric', precision: 78, scale: 0, default: '0' })
  totalReceivedMondg!: string;

  @Column({ name: 'total_sent_mondg', type: 'numeric', precision: 78, scale: 0, default: '0' })
  totalSentMondg!: string;

  @Column({ name: 'transaction_count', default: 0 })
  transactionCount!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  // MPC key reference (never store actual private key here)
  @Column({ name: 'mpc_key_id', nullable: true, length: 100 })
  mpcKeyId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
