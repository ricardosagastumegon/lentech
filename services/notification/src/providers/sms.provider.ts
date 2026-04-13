// ============================================================
// MONDEGA DIGITAL — SMS Provider (Twilio)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SMSProvider {
  private readonly logger = new Logger(SMSProvider.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private readonly config: ConfigService) {
    const sid = config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const token = config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = config.getOrThrow<string>('TWILIO_FROM_NUMBER');
    this.client = twilio(sid, token);
  }

  async send(to: string, message: string): Promise<{ sid: string; status: string }> {
    try {
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body: message,
      });

      this.logger.log(`SMS sent to ${to.slice(0, 6)}... | SID: ${result.sid} | Status: ${result.status}`);
      return { sid: result.sid, status: result.status };

    } catch (err) {
      this.logger.error(`SMS failed to ${to.slice(0, 6)}...: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendVerificationCode(to: string, code: string, expiryMinutes: number): Promise<void> {
    const message =
      `🔐 Tu código de verificación Mondega: *${code}*\n` +
      `Válido por ${expiryMinutes} minutos.\n` +
      `Nunca compartas este código.`;
    await this.send(to, message);
  }

  async sendTransactionNotification(to: string, params: {
    type: 'sent' | 'received';
    amount: string;
    currency: string;
    counterparty: string;
  }): Promise<void> {
    const emoji = params.type === 'sent' ? '📤' : '📥';
    const verb = params.type === 'sent' ? 'Enviaste' : 'Recibiste';
    const message =
      `${emoji} ${verb} ${params.amount} ${params.currency}\n` +
      `${params.type === 'sent' ? 'A' : 'De'}: ${params.counterparty}\n` +
      `Mondega Digital`;
    await this.send(to, message);
  }
}
