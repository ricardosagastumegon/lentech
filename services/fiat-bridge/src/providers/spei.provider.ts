// ============================================================
// MONDEGA DIGITAL — SPEI México Bridge
// Sistema de Pagos Electrónicos Interbancarios (Banxico)
// CoDi (Cobro Digital) + SPEI transfers
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { verifyWebhook } from '@mondega/shared-utils';

export interface SPEIDepositRequest {
  referenceId: string;
  clabe: string;         // 18-digit Mexican CLABE
  amountMXN: string;
  concept: string;       // Required by SPEI (up to 40 chars)
  recipientRFC?: string; // Tax ID (optional)
}

export interface CoDiChargeRequest {
  referenceId: string;
  amountMXN: string;
  concept: string;
  phoneNumber: string;   // Mexican phone for CoDi notification
  expiresInSeconds?: number;
}

@Injectable()
export class SPEIProvider {
  private readonly logger = new Logger(SPEIProvider.name);
  private readonly client: AxiosInstance;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.webhookSecret = config.getOrThrow<string>('WEBHOOK_SECRET_MX');

    // SPEI requires mutual TLS (client certificate from Banxico)
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(config.get('CODI_CERT_PATH', '/certs/codi.pem')),
      key:  fs.readFileSync(config.get('CODI_KEY_PATH', '/certs/codi.key')),
      rejectUnauthorized: true,
    });

    this.client = axios.create({
      baseURL: config.get('CODI_BASE_URL', 'https://ccen.banxico.org.mx'),
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000, // SPEI can be slow
    });
  }

  // ---- SPEI Transfer (CLABE to CLABE) ----

  async initiateSPEI(req: SPEIDepositRequest): Promise<{
    ordenPagoId: string;
    claveRastreo: string;
    status: string;
  }> {
    this.logger.log(`SPEI: ${req.referenceId} | MXN ${req.amountMXN} → ${req.clabe.slice(0, 6)}...`);

    try {
      const res = await this.client.post('/api/v1/ordenes-pago', {
        referencia: req.referenceId,
        monto: parseFloat(req.amountMXN),
        moneda: 'MXN',
        tipoPago: '03', // SPEI standard
        nombreBeneficiario: 'Mondega Digital SA de CV',
        cuentaBeneficiario: req.clabe,
        concepto: req.concept.slice(0, 40),
        rfcCurpBeneficiario: req.recipientRFC ?? 'XAXX010101000', // Público en general
        tipoCuentaBeneficiario: '40', // CLABE
        institucionContraparte: this.getCLABEBank(req.clabe),
      });

      return {
        ordenPagoId: res.data.ordenPagoId,
        claveRastreo: res.data.claveRastreo,
        status: res.data.estado,
      };
    } catch (err) {
      this.logger.error(`SPEI failed: ${(err as Error).message}`);
      throw new BadRequestException(`SPEI transfer failed: ${(err as Error).message}`);
    }
  }

  // ---- CoDi Charge (QR code payment via mobile banking) ----

  async createCoDiCharge(req: CoDiChargeRequest): Promise<{
    qrCodeBase64: string;
    codiReference: string;
    expiresAt: Date;
    deepLink: string;
  }> {
    this.logger.log(`CoDi charge: ${req.referenceId} | MXN ${req.amountMXN}`);

    try {
      const res = await this.client.post('/api/v1/codi/cargos', {
        referencia: req.referenceId,
        monto: parseFloat(req.amountMXN),
        concepto: req.concept,
        telefono: req.phoneNumber,
        tiempoExpiracion: req.expiresInSeconds ?? 300,
        urlCallback: `${this.config.get('APP_URL')}/api/fiat/webhook/mx/codi`,
      });

      return {
        qrCodeBase64: res.data.codigoQr,
        codiReference: res.data.referenciaCodi,
        expiresAt: new Date(res.data.fechaExpiracion),
        deepLink: res.data.deepLink,
      };
    } catch (err) {
      this.logger.error(`CoDi charge failed: ${(err as Error).message}`);
      throw new BadRequestException(`CoDi charge failed: ${(err as Error).message}`);
    }
  }

  // ---- OXXO Pay (via OpenPay) ----

  async createOXXOReference(params: {
    referenceId: string;
    amountMXN: string;
    customerEmail: string;
    customerName: string;
  }): Promise<{ barcode: string; reference: string; expiresAt: Date; instructions: string }> {
    const openPayKey = this.config.getOrThrow<string>('OXXO_API_KEY');
    const openPayUrl = this.config.get('OXXO_API_URL', 'https://api.openpay.mx');

    const res = await axios.post(
      `${openPayUrl}/v1/charges`,
      {
        method: 'store',
        amount: parseFloat(params.amountMXN),
        currency: 'MXN',
        description: `Mondega Digital recarga — ${params.referenceId}`,
        order_id: params.referenceId,
        customer: {
          name: params.customerName,
          email: params.customerEmail,
        },
      },
      {
        auth: { username: openPayKey, password: '' },
        timeout: 10000,
      },
    );

    return {
      barcode: res.data.payment_method.barcode_url,
      reference: res.data.payment_method.reference,
      expiresAt: new Date(res.data.due_date),
      instructions: 'Presenta este código en cualquier tienda OXXO de México',
    };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    return verifyWebhook(payload, signature, this.webhookSecret);
  }

  // Extract bank code from first 3 digits of CLABE
  private getCLABEBank(clabe: string): string {
    const bankCodes: Record<string, string> = {
      '002': '40002', '006': '40006', '009': '40009', '014': '40014',
      '021': '40021', '030': '40030', '036': '40036', '044': '40044',
      '058': '40058', '059': '40059', '060': '40060', '062': '40062',
    };
    return bankCodes[clabe.slice(0, 3)] ?? '40002';
  }
}
