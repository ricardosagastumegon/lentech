import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('otp_codes')
@Index(['phoneNumber', 'type', 'used'])
@Index(['expiresAt'])
export class OTPCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber!: string;

  // Argon2id hash of the actual code — never stored plaintext
  @Column({ length: 512 })
  code!: string;

  @Column({ length: 50 })
  type!: string;  // 'verification' | 'pin_reset' | 'login'

  @Column({ default: false })
  used!: boolean;

  // Track failed attempts per OTP to prevent brute force
  @Column({ name: 'failed_attempts', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
