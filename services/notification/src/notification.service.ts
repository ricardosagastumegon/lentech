// ============================================================
// MONDEGA DIGITAL — Notification Orchestrator
// Routes notifications to correct channels per user preferences
// Priority: Push > WhatsApp > SMS > Email
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SMSProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';
import { EmailProvider } from './providers/email.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';

export interface NotificationPayload {
  userId: string;
  phoneNumber?: string;
  email?: string;
  fcmToken?: string;
  channels: ('sms' | 'push' | 'email' | 'whatsapp')[];
  type: string;
  data: Record<string, unknown>;
}

@Processor('notifications')
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly sms: SMSProvider,
    private readonly push: PushProvider,
    private readonly email: EmailProvider,
    private readonly whatsapp: WhatsAppProvider,
  ) {}

  // ---- Kafka Queue Consumers ----

  @Process('send-sms')
  async processSMS(job: Job<{ to: string; message: string }>) {
    await this.sms.send(job.data.to, job.data.message);
  }

  @Process('user-registered')
  async processUserRegistered(job: Job<{ userId: string; phoneNumber: string; country: string; email?: string }>) {
    const { phoneNumber, email } = job.data;

    // Welcome SMS
    if (phoneNumber) {
      await this.sms.send(phoneNumber,
        '¡Bienvenido a Mondega Digital! Tu cuenta fue creada. Verifica tu número para comenzar. 🌎',
      );
    }

    // Welcome email
    if (email) {
      await this.email.sendWelcome(email, 'Usuario', job.data.country);
    }
  }

  @Process('transaction-notification')
  async processTransactionNotification(job: Job<{
    transactionId: string;
    type: 'TRANSFER_COMPLETED' | 'TRANSFER_FAILED';
    fromAddress: string;
    toAddress?: string;
    amount: string;
    reason?: string;
  }>) {
    const { type, transactionId, amount, reason } = job.data;

    if (type === 'TRANSFER_COMPLETED') {
      this.logger.log(`TX completed notification: ${transactionId}`);
      // In production: look up user phone/email from user service
      // then call appropriate provider based on their preferences
    } else if (type === 'TRANSFER_FAILED') {
      this.logger.warn(`TX failed notification: ${transactionId} — ${reason}`);
    }
  }

  @Process('kyc-approved')
  async processKYCApproved(job: Job<{ userId: string; newKycLevel: number }>) {
    this.logger.log(`KYC approved for ${job.data.userId}: level ${job.data.newKycLevel}`);
    // Notify user via push + SMS that their limits have increased
  }

  @Process('kyc-rejected')
  async processKYCRejected(job: Job<{ userId: string; reason: string }>) {
    this.logger.warn(`KYC rejected for ${job.data.userId}: ${job.data.reason}`);
    // Notify user to retry KYC with correct documents
  }

  @Process('aml-alert')
  async processAMLAlert(job: Job<{
    alertId: string;
    userId: string;
    riskLevel: string;
    reportToAuthority: boolean;
  }>) {
    this.logger.warn(
      `AML alert queued: ${job.data.alertId} | user=${job.data.userId} | risk=${job.data.riskLevel}`,
    );
    // Notify compliance team via internal channel (Slack/email)
    // If critical: page on-call officer immediately
  }

  // ---- Direct send methods ----

  async sendOTP(phoneNumber: string, code: string, channel: 'sms' | 'whatsapp' = 'sms') {
    if (channel === 'whatsapp') {
      try {
        await this.whatsapp.sendOTP(phoneNumber, code);
        return;
      } catch {
        this.logger.warn('WhatsApp OTP failed, falling back to SMS');
      }
    }
    await this.sms.sendVerificationCode(phoneNumber, code, 10);
  }
}
