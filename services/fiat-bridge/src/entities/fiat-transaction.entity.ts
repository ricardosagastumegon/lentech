import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { FiatProvider, Currency } from '@mondega/shared-types';

@Entity('fiat_transactions')
@Index(['userId', 'createdAt'])
@Index(['externalReference'])
@Index(['status'])
@Index(['provider'])
export class FiatTransaction {
  @PrimaryColumn({ length: 100 })
  id!: string;  // ftx_...

  @Column({ name: 'user_id', length: 100 })
  userId!: string;

  @Column({ name: 'mondega_tx_id', nullable: true, length: 100 })
  mondegaTxId?: string;

  @Column({ type: 'enum', enum: FiatProvider })
  provider!: FiatProvider;

  @Column({ name: 'external_reference', length: 200 })
  externalReference!: string;

  @Column({ length: 20 })
  type!: string;  // 'load' | 'withdraw'

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  amount!: string;

  @Column({ type: 'enum', enum: Currency })
  currency!: Currency;

  @Column({
    length: 50,
    default: 'pending',
    // 'pending' | 'processing' | 'completed' | 'failed' | 'reversed'
  })
  status!: string;

  @Column({ name: 'webhook_received', default: false })
  webhookReceived!: boolean;

  @Column({ name: 'webhook_payload', type: 'jsonb', nullable: true })
  webhookPayload?: Record<string, unknown>;

  @Column({ name: 'failure_reason', nullable: true, length: 500 })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
