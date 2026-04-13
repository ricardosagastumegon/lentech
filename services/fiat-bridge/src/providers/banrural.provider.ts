// ============================================================
// MONDEGA DIGITAL — Banrural Guatemala Bridge
// Integración con Banco de Desarrollo Rural (Banrural)
// Protocolo: REST API + webhook confirmación
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { verifyWebhook } from '@mondega/shared-utils';

export interface BanruralDepositRequest {
  referenceId: string;     // Internal Mondega reference
  accountNumber: string;   // User's Banrural account
  amountGTQ: string;       // Amount in Quetzales
  description: string;
}

export interface BanruralDepositResponse {
  transactionId: string;   // Banrural transaction ID
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  estimatedCompletionTime: Date;
  bankReference: string;
}

export interface BanruralWebhookPayload {
  event: 'TRANSACTION_COMPLETED' | 'TRANSACTION_FAILED' | 'TRANSACTION_REVERSED';
  transactionId: string;
  referenceId: string;
  amountGTQ: string;
  status: string;
  timestamp: string;
  signature: string;
}

@Injectable()
export class BanruralProvider {
  private readonly logger = new Logger(BanruralProvider.name);
  private readonly client: AxiosInstance;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.getOrThrow<string>('BANRURAL_API_KEY');
    const baseUrl = config.get('BANRURAL_API_URL', 'https://api.banrural.com.gt');
    this.webhookSecret = config.getOrThrow<string>('WEBHOOK_SECRET_GT');

    this.client = axios.create({
      baseURL: `${baseUrl}/v1`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-ID': 'Mondega-Digital',
      },
      timeout: 15000,
    });
  }

  // ---- Initiate deposit: User sends money FROM their Banrural account TO Mondega ----

  async initiateDeposit(req: BanruralDepositRequest): Promise<BanruralDepositResponse> {
    this.logger.log(`Banrural deposit: ${req.referenceId} | GTQ ${req.amountGTQ}`);

    try {
      const res = await this.client.post<BanruralDepositResponse>('/transfers/inbound', {
        reference_id: req.referenceId,
        source_account: req.accountNumber,
        destination_account: this.config.getOrThrow('BANRURAL_MONDEGA_ACCOUNT'),
        amount: req.amountGTQ,
        currency: 'GTQ',
        description: req.description,
        webhook_url: `${this.config.get('APP_URL')}/api/fiat/webhook/gt`,
        callback_reference: req.referenceId,
      });

      return res.data;
    } catch (err) {
      this.logger.error(`Banrural deposit failed: ${(err as Error).message}`);
      throw new BadRequestException(`Banrural transfer failed: ${(err as Error).message}`);
    }
  }

  // ---- Initiate withdrawal: User receives money IN their Banrural account FROM Mondega ----

  async initiateWithdrawal(params: {
    referenceId: string;
    destinationAccount: string;
    amountGTQ: string;
    recipientName: string;
  }): Promise<BanruralDepositResponse> {
    this.logger.log(`Banrural withdrawal: ${params.referenceId} | GTQ ${params.amountGTQ}`);

    try {
      const res = await this.client.post<BanruralDepositResponse>('/transfers/outbound', {
        reference_id: params.referenceId,
        source_account: this.config.getOrThrow('BANRURAL_MONDEGA_ACCOUNT'),
        destination_account: params.destinationAccount,
        amount: params.amountGTQ,
        currency: 'GTQ',
        recipient_name: params.recipientName,
        webhook_url: `${this.config.get('APP_URL')}/api/fiat/webhook/gt`,
      });

      return res.data;
    } catch (err) {
      this.logger.error(`Banrural withdrawal failed: ${(err as Error).message}`);
      throw new BadRequestException(`Banrural withdrawal failed: ${(err as Error).message}`);
    }
  }

  // ---- Verify webhook signature (HMAC-SHA256) ----

  verifyWebhook(payload: string, signature: string): boolean {
    return verifyWebhook(payload, signature, this.webhookSecret);
  }

  // ---- Get transaction status ----

  async getStatus(bankTransactionId: string): Promise<{ status: string; updatedAt: Date }> {
    const res = await this.client.get(`/transfers/${bankTransactionId}`);
    return {
      status: res.data.status,
      updatedAt: new Date(res.data.updated_at),
    };
  }

  // ---- Generate deposit reference for OXXO-like cash agents ----

  async generateCashDepositCode(params: {
    referenceId: string;
    amountGTQ: string;
    expiresInHours?: number;
  }): Promise<{ code: string; barcode: string; expiresAt: Date }> {
    const res = await this.client.post('/cash-deposits/generate', {
      reference_id: params.referenceId,
      amount: params.amountGTQ,
      currency: 'GTQ',
      expires_in_hours: params.expiresInHours ?? 24,
    });

    return {
      code: res.data.code,
      barcode: res.data.barcode_url,
      expiresAt: new Date(res.data.expires_at),
    };
  }
}
