import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('sessions')
@Index(['userId', 'isRevoked'])
@Index(['tokenIndex'], { unique: true })   // O(1) refresh lookup
@Index(['expiresAt'])
export class Session {
  @PrimaryColumn({ length: 100 })
  id!: string;  // ses_...

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'refresh_token_hash', length: 512 })
  refreshTokenHash!: string;  // argon2id hash

  // SHA-256 digest of raw token — enables fast lookup without full table scan
  @Column({ name: 'token_index', length: 64 })
  tokenIndex!: string;

  @Column({ name: 'user_agent', length: 512, nullable: true })
  userAgent!: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress!: string;

  @Column({ name: 'is_revoked', default: false })
  isRevoked!: boolean;

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
