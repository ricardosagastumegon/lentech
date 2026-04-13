import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { AMLRisk } from '@mondega/shared-types';

@Entity('aml_alerts')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['riskLevel'])
@Index(['transactionId'])
export class AMLAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', length: 100 })
  userId!: string;

  @Column({ name: 'transaction_id', nullable: true, length: 100 })
  transactionId?: string;

  @Column({ name: 'risk_level', type: 'enum', enum: AMLRisk, default: AMLRisk.LOW })
  riskLevel!: AMLRisk;

  @Column({ name: 'rule_triggered', length: 1000 })
  ruleTriggered!: string;

  @Column({ length: 2000 })
  description!: string;

  @Column({
    length: 50,
    default: 'open',
    // open | investigating | cleared | reported
  })
  status!: string;

  @Column({ name: 'assigned_to', nullable: true, length: 100 })
  assignedTo?: string;

  @Column({ name: 'reported_at', nullable: true, type: 'timestamptz' })
  reportedAt?: Date;

  @Column({ name: 'resolved_at', nullable: true, type: 'timestamptz' })
  resolvedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
