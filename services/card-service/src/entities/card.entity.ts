import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('cards')
@Index(['userId'])
@Index(['issuerCardId'], { unique: true })
@Index(['status'])
export class CardEntity {
  @PrimaryColumn({ length: 100 })
  id!: string;  // crd_...

  @Column({ name: 'user_id', length: 100 })
  userId!: string;

  @Column({ name: 'issuer_card_id', length: 200 })
  issuerCardId!: string;  // Marqeta/Galileo card token

  @Column({ length: 20 })
  type!: string;  // 'virtual' | 'physical'

  @Column({ length: 20, default: 'active' })
  status!: string;  // 'active' | 'frozen' | 'blocked' | 'expired' | 'pending'

  @Column({ length: 20, default: 'mastercard' })
  network!: string;

  @Column({ length: 10, default: 'USD' })
  currency!: string;

  // PAN stored encrypted — only last 4 exposed to user
  @Column({ name: 'pan_encrypted', nullable: true, length: 512 })
  panEncrypted?: string;

  @Column({ name: 'last_four', length: 4 })
  lastFour!: string;

  @Column({ name: 'expiry_month', length: 2 })
  expiryMonth!: string;

  @Column({ name: 'expiry_year', length: 4 })
  expiryYear!: string;

  @Column({ name: 'spending_limit_daily_usd', type: 'numeric', precision: 10, scale: 2, default: 500 })
  spendingLimitDailyUSD!: number;

  @Column({ name: 'delivery_address', type: 'jsonb', nullable: true })
  deliveryAddress?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
