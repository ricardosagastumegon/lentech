// ============================================================
// MONDEGA DIGITAL — WhatsApp Provider (Meta Cloud API)
// WhatsApp Business API — key channel in Mesoamérica
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const WA_API_VERSION = 'v18.0';

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.token = config.getOrThrow<string>('WHATSAPP_API_TOKEN');
    this.phoneNumberId = config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiUrl = `https://graph.facebook.com/${WA_API_VERSION}/${this.phoneNumberId}/messages`;
  }

  async sendTemplate(params: {
    to: string;  // E.164 format without +
    templateName: string;
    languageCode: 'es' | 'en';
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{ type: 'text' | 'currency' | 'date_time'; text?: string; currency?: { amount_1000: number; code: string; fallback_value: string } }>;
    }>;
  }): Promise<string> {
    try {
      const res = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to.replace('+', ''),
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.languageCode },
            components: params.components ?? [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      const messageId = res.data?.messages?.[0]?.id ?? 'unknown';
      this.logger.log(`WhatsApp template '${params.templateName}' sent to ${params.to.slice(0, 6)}... | id: ${messageId}`);
      return messageId;

    } catch (err) {
      this.logger.error(`WhatsApp failed to ${params.to.slice(0, 6)}...: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendOTP(to: string, code: string): Promise<void> {
    await this.sendTemplate({
      to,
      templateName: 'mondega_otp',
      languageCode: 'es',
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: code },
          { type: 'text', text: '10' }, // expiry minutes
        ],
      }],
    });
  }

  async sendTransactionAlert(to: string, params: {
    type: 'sent' | 'received';
    amount: string;
    currency: string;
    name: string;
  }): Promise<void> {
    await this.sendTemplate({
      to,
      templateName: params.type === 'sent' ? 'mondega_tx_sent' : 'mondega_tx_received',
      languageCode: 'es',
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: params.name },
          { type: 'text', text: `${params.amount} ${params.currency}` },
        ],
      }],
    });
  }
}
