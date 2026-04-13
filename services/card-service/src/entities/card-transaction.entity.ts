import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('card_transactions')
@Index(['cardId', 'createdAt'])
@Index(['status'])
export class CardTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'card_id', length: 100 })
  cardId!: string;

  @Column({ name: 'issuer_tx_id', length: 200 })
  issuerTxId!: string;

  @Column({ length: 50 })
  type!: string;  // 'authorization' | 'clearing' | 'refund' | 'dispute'

  @Column({ length: 20, default: 'approved' })
  status!: string;

  @Column({ name: 'amount_usd', type: 'numeric', precision: 10, scale: 2 })
  amountUSD!: number;

  @Column({ name: 'amount_local', type: 'numeric', precision: 20, scale: 4, nullable: true })
  amountLocal?: number;

  @Column({ name: 'local_currency', nullable: true, length: 10 })
  localCurrency?: string;

  @Column({ name: 'merchant_name', nullable: true, length: 200 })
  merchantName?: string;

  @Column({ name: 'merchant_category', nullable: true, length: 100 })
  merchantCategory?: string;

  @Column({ nullable: true, length: 2 })
  country?: string;

  @Column({ name: 'decline_reason', nullable: true, length: 200 })
  declineReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
