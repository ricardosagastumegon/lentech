// ============================================================
// LEN — BAC Honduras Bridge
// Banco Atlántida + BAC Credomatic Honduras
// Protocol: REST API + HMAC-SHA256 webhook
// Supports: transfers, withdrawals, account status
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface BACDepositRequest {
  referenceId: string;     // LEN internal reference (stored in banco concept field)
  userId: string;
  amountHNL: string;
  description: string;
}

export interface BACDepositResponse {
  transactionId: string;
  referenceNumber: string;
  status: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';
  estimatedCompletionTime: Date;
  poolAccountHNL: string;   // LEN's receiving account at BAC
  concept: string;          // The reference the user must include in transfer
}

export interface BACWebhookPayload {
  eventoTipo: 'DEPOSITO_CONFIRMADO' | 'DEPOSITO_FALLIDO' | 'RETIRO_COMPLETADO';
  transaccionId: string;
  referenciaCliente: string;    // matches referenceId sent by LEN
  montoHNL: string;
  estado: string;
  fechaHora: string;
  firma: string;                // HMAC-SHA256 of payload body
  cuentaOrigen?: string;        // user's bank account (masked)
}

export interface BACWithdrawalRequest {
  referenceId: string;
  destinationAccount: string;   // user's HN bank account or IBAN
  destinationBank: string;      // ATLANTIDA | FICOHSA | BANPAIS | OCCIDENTE
  amountHNL: string;
  recipientName: string;
  recipientId?: string;         // DPI or RTN (optional for compliance)
}

@Injectable()
export class BACProvider {
  private readonly logger = new Logger(BACProvider.name);
  private readonly client: AxiosInstance;
  private readonly webhookSecret: string;
  private readonly lenPoolAccount: string;

  constructor(private readonly config: ConfigService) {
    const apiKey  = config.getOrThrow<string>('BAC_API_KEY');
    const apiSecret = config.getOrThrow<string>('BAC_API_SECRET');
    const baseUrl = config.get('BAC_API_URL', 'https://api.baccredomatic.com.hn');

    this.webhookSecret   = config.getOrThrow<string>('WEBHOOK_SECRET_HN');
    this.lenPoolAccount  = config.getOrThrow<string>('BAC_LEN_POOL_ACCOUNT');

    // BAC uses HMAC-signed requests (apiKey + timestamp + body)
    this.client = axios.create({
      baseURL: `${baseUrl}/v2`,
      timeout: 20000,
    });

    // Request interceptor: sign every outgoing request
    this.client.interceptors.request.use((cfg) => {
      const timestamp = Date.now().toString();
      const body      = cfg.data ? JSON.stringify(cfg.data) : '';
      const toSign    = `${apiKey}${timestamp}${body}`;
      const signature = crypto.createHmac('sha256', apiSecret).update(toSign).digest('hex');

      cfg.headers['X-API-Key']   = apiKey;
      cfg.headers['X-Timestamp'] = timestamp;
      cfg.headers['X-Signature'] = signature;
      cfg.headers['Content-Type'] = 'application/json';
      return cfg;
    });
  }

  // ── Deposit: User sends HNL to LEN pool account at BAC ────────────────────
  // LEN gives user a unique referenceId to include as transfer concept.
  // BAC webhook fires when transfer arrives → LEN credits wallet.

  async initiateDeposit(req: BACDepositRequest): Promise<BACDepositResponse> {
    this.logger.log(`BAC deposit: ${req.referenceId} | HNL ${req.amountHNL}`);

    try {
      const res = await this.client.post<BACDepositResponse>('/transferencias/entrada', {
        referenciaCliente: req.referenceId,
        usuarioId:         req.userId,
        cuentaDestino:     this.lenPoolAccount,
        montoHNL:          req.amountHNL,
        descripcion:       `LEN ${req.referenceId.slice(-8)}`,
        urlWebhook:        `${this.config.get('APP_URL')}/api/fiat/webhook/hn`,
      });

      return res.data;
    } catch (err) {
      this.logger.error(`BAC deposit init failed: ${(err as Error).message}`);
      throw new BadRequestException(`BAC deposit failed: ${(err as Error).message}`);
    }
  }

  // ── Withdrawal: LEN sends HNL from pool to user's bank account ─────────────

  async initiateWithdrawal(req: BACWithdrawalRequest): Promise<{
    transactionId: string;
    status: string;
    estimatedTime: string;
  }> {
    this.logger.log(`BAC withdrawal: ${req.referenceId} | HNL ${req.amountHNL} → ${req.destinationBank}`);

    try {
      const res = await this.client.post('/transferencias/salida', {
        referenciaCliente:  req.referenceId,
        cuentaOrigen:       this.lenPoolAccount,
        cuentaDestino:      req.destinationAccount,
        bancoDestino:       req.destinationBank,
        montoHNL:           req.amountHNL,
        nombreBeneficiario: req.recipientName,
        identificacion:     req.recipientId ?? '',
        urlWebhook:         `${this.config.get('APP_URL')}/api/fiat/webhook/hn`,
      });

      return {
        transactionId: res.data.transaccionId,
        status:        res.data.estado,
        estimatedTime: '30-60 minutos (L-V hábil)',
      };
    } catch (err) {
      this.logger.error(`BAC withdrawal failed: ${(err as Error).message}`);
      throw new BadRequestException(`BAC withdrawal failed: ${(err as Error).message}`);
    }
  }

  // ── Webhook signature verification ────────────────────────────────────────
  // BAC sends HMAC-SHA256(secret + timestamp + body) in X-BAC-Signature header

  verifyWebhook(rawBody: string, signature: string, timestamp: string): boolean {
    const toVerify   = `${this.webhookSecret}${timestamp}${rawBody}`;
    const expected   = crypto.createHmac('sha256', this.webhookSecret).update(toVerify).digest('hex');
    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  // ── Query transaction status ───────────────────────────────────────────────

  async getTransactionStatus(transactionId: string): Promise<{
    status: string;
    amount: string;
    updatedAt: Date;
  }> {
    const res = await this.client.get(`/transferencias/${transactionId}`);
    return {
      status:    res.data.estado,
      amount:    res.data.montoHNL,
      updatedAt: new Date(res.data.fechaActualizacion),
    };
  }

  // ── Generate virtual reference for a user ─────────────────────────────────
  // Since HN doesn't support per-user virtual accounts like CLABE,
  // we generate a deterministic 8-digit reference from userId.
  // User must include this reference when making bank transfer.

  generateUserReference(userId: string): string {
    const hash = crypto.createHash('sha256').update(`LEN-HN-${userId}`).digest('hex');
    // Take 8 digits from the hash (deterministic per userId)
    const digits = parseInt(hash.slice(0, 8), 16).toString().slice(0, 8).padStart(8, '0');
    return `HN${digits}`;
  }
}
