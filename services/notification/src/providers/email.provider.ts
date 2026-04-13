// ============================================================
// MONDEGA DIGITAL — Email Provider (SendGrid)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

export type EmailTemplate =
  | 'welcome'
  | 'otp_verification'
  | 'transaction_sent'
  | 'transaction_received'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'pin_reset'
  | 'account_locked'
  | 'monthly_statement';

const TEMPLATE_IDS: Record<EmailTemplate, string> = {
  welcome:              'd-welcome001',
  otp_verification:     'd-otp001',
  transaction_sent:     'd-txsent001',
  transaction_received: 'd-txrec001',
  kyc_approved:         'd-kyc001',
  kyc_rejected:         'd-kyc002',
  pin_reset:            'd-pin001',
  account_locked:       'd-lock001',
  monthly_statement:    'd-stmt001',
};

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(config.getOrThrow<string>('SENDGRID_API_KEY'));
    this.fromEmail = config.get('SENDGRID_FROM_EMAIL', 'noreply@mondega.io');
  }

  async send(params: {
    to: string;
    template: EmailTemplate;
    dynamicData: Record<string, unknown>;
    subject?: string;
  }): Promise<void> {
    try {
      await sgMail.send({
        to: params.to,
        from: { email: this.fromEmail, name: 'Mondega Digital' },
        templateId: TEMPLATE_IDS[params.template],
        dynamicTemplateData: {
          ...params.dynamicData,
          year: new Date().getFullYear(),
          support_email: 'soporte@mondega.io',
        },
      });
      this.logger.log(`Email sent to ${params.to.split('@')[0]}@... | template: ${params.template}`);
    } catch (err) {
      this.logger.error(`Email failed to ${params.to}: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendWelcome(to: string, firstName: string, country: string): Promise<void> {
    await this.send({
      to,
      template: 'welcome',
      dynamicData: { firstName, country },
    });
  }

  async sendTransactionConfirmation(to: string, params: {
    type: 'sent' | 'received';
    amount: string;
    currency: string;
    txId: string;
    counterparty: string;
    timestamp: Date;
  }): Promise<void> {
    const template = params.type === 'sent' ? 'transaction_sent' : 'transaction_received';
    await this.send({
      to,
      template,
      dynamicData: {
        amount: params.amount,
        currency: params.currency,
        txId: params.txId,
        counterparty: params.counterparty,
        timestamp: params.timestamp.toISOString(),
      },
    });
  }
}
