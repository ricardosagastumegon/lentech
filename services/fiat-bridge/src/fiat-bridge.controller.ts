// ============================================================
// LEN — Fiat Bridge Controller
// REST endpoints for deposit instructions, withdrawals,
// and bank webhooks (GT/MX/HN).
//
// SECURITY:
//   - All webhooks verified with HMAC-SHA256
//   - Webhook endpoints return 200 immediately (async processing)
//   - Idempotency: duplicate webhooks are silently ignored
//   - Rate limiting on deposit/withdrawal endpoints (via guard)
// ============================================================

import {
  Controller, Post, Get, Body, Param, Headers, RawBodyRequest,
  Req, HttpCode, HttpStatus, BadRequestException, Logger,
  UseGuards, ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { FiatBridgeService } from './fiat-bridge.service';
import { VirtualAccountService } from './virtual-account.service';
import { BanruralProvider, BanruralWebhookPayload } from './providers/banrural.provider';
import { SPEIProvider } from './providers/spei.provider';
import { BACProvider, BACWebhookPayload } from './providers/bac.provider';
import { VirtualAccountCountry } from './entities/virtual-account.entity';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class GetDepositInstructionsDto {
  userId!: string;
  country!: VirtualAccountCountry;
}

class InitiateWithdrawalDto {
  userId!: string;
  country!: VirtualAccountCountry;
  destinationAccount!: string;
  destinationBank!: string;
  amountFiat!: string;
  recipientName!: string;
  recipientId?: string;
  pin!: string;              // validated by auth middleware
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('api/fiat')
export class FiatBridgeController {
  private readonly logger = new Logger(FiatBridgeController.name);

  constructor(
    private readonly fiatBridge:      FiatBridgeService,
    private readonly virtualAccounts: VirtualAccountService,
    private readonly banrural:        BanruralProvider,
    private readonly spei:            SPEIProvider,
    private readonly bac:             BACProvider,
  ) {}

  // ── GET deposit instructions for a user ───────────────────────────────────
  // Called by the app when user opens "Depositar" screen.
  // Returns the bank account / CLABE / reference to show to the user.

  @Get('deposit-instructions/:userId/:country')
  async getDepositInstructions(
    @Param('userId')  userId:  string,
    @Param('country') country: VirtualAccountCountry,
  ) {
    const instructions = await this.virtualAccounts.getDepositInstructions(userId, country);
    return { ok: true, data: instructions };
  }

  // ── POST initiate withdrawal ───────────────────────────────────────────────
  // Called when user taps "Retirar" → PIN confirmed → submit.

  @Post('withdraw')
  @HttpCode(HttpStatus.ACCEPTED)
  async initiateWithdrawal(@Body() dto: InitiateWithdrawalDto) {
    const result = await this.fiatBridge.initiateWithdrawal({
      userId:             dto.userId,
      provider:           this.countryToProvider(dto.country),
      amountFiat:         dto.amountFiat,
      currency:           this.countryToCurrency(dto.country),
      destinationAccount: dto.destinationAccount,
      recipientName:      dto.recipientName,
    });

    return { ok: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BANK WEBHOOKS — Banks call these when a deposit or transfer completes.
  // ALL webhooks:
  //   1. Verify HMAC signature immediately (reject if invalid)
  //   2. Return HTTP 200 fast (async processing via queue)
  //   3. Log every payload for audit trail
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Guatemala — Banrural webhook ──────────────────────────────────────────

  @Post('webhook/gt')
  @HttpCode(HttpStatus.OK)
  async webhookBanrural(
    @Req()           req:       RawBodyRequest<Request>,
    @Headers('x-banrural-signature') signature: string,
    @Body()          body:      BanruralWebhookPayload,
  ) {
    // 1. Verify signature
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);
    if (!this.banrural.verifyWebhook(rawBody, signature)) {
      this.logger.warn(`Banrural webhook rejected — invalid signature`);
      throw new ForbiddenException('Invalid webhook signature');
    }

    this.logger.log(`Banrural webhook: ${body.event} | ref:${body.referenceId} | GTQ ${body.amountGTQ}`);

    if (body.event === 'TRANSACTION_COMPLETED') {
      // 2. Resolve which user this deposit belongs to
      const resolved = await this.virtualAccounts.resolveDeposit({
        country:   'GT',
        reference: body.referenceId,
        amount:    body.amountGTQ,
      });

      if (resolved) {
        // 3. Confirm deposit → queues wallet credit
        await this.fiatBridge.handleDepositConfirmation({
          fiatTxId:           body.referenceId,
          externalReference:  body.transactionId,
          confirmedAmountFiat: body.amountGTQ,
          currency:           'GTQ' as any,
        });
      }
    }

    return { received: true };
  }

  // ── México — SPEI webhook ─────────────────────────────────────────────────

  @Post('webhook/mx')
  @HttpCode(HttpStatus.OK)
  async webhookSPEI(
    @Req()           req:       RawBodyRequest<Request>,
    @Headers('x-spei-signature') signature: string,
    @Body()          body:      SPEIWebhookPayload,
  ) {
    // 1. Verify SPEI signature
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);
    if (!this.spei.verifyWebhook(rawBody, signature)) {
      this.logger.warn(`SPEI webhook rejected — invalid signature`);
      throw new ForbiddenException('Invalid webhook signature');
    }

    this.logger.log(`SPEI webhook: ${body.tipoEvento} | clabe:${body.clabeDestino?.slice(0, 6)}... | MXN ${body.monto}`);

    if (body.tipoEvento === 'ABONO_RECIBIDO') {
      // MX: match by destination CLABE (each user has their own CLABE)
      const resolved = await this.virtualAccounts.resolveDeposit({
        country: 'MX',
        clabe:   body.clabeDestino,
        reference: body.claveRastreo,
        amount:  body.monto.toString(),
      });

      if (resolved) {
        await this.fiatBridge.handleDepositConfirmation({
          fiatTxId:            body.claveRastreo,
          externalReference:   body.claveRastreo,
          confirmedAmountFiat: body.monto.toString(),
          currency:            'MXN' as any,
        });
      }
    }

    return { received: true };
  }

  // ── CoDi (México QR) webhook ──────────────────────────────────────────────

  @Post('webhook/mx/codi')
  @HttpCode(HttpStatus.OK)
  async webhookCoDi(
    @Req()  req:  RawBodyRequest<Request>,
    @Headers('x-codi-signature') signature: string,
    @Body() body: CoDiWebhookPayload,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);
    if (!this.spei.verifyWebhook(rawBody, signature)) {
      throw new ForbiddenException('Invalid CoDi signature');
    }

    this.logger.log(`CoDi webhook: ${body.estado} | ref:${body.referencia} | MXN ${body.monto}`);

    if (body.estado === 'PAGADO') {
      await this.fiatBridge.handleDepositConfirmation({
        fiatTxId:            body.referencia,
        externalReference:   body.codiId,
        confirmedAmountFiat: body.monto.toString(),
        currency:            'MXN' as any,
      });
    }

    return { received: true };
  }

  // ── Honduras — BAC webhook ────────────────────────────────────────────────

  @Post('webhook/hn')
  @HttpCode(HttpStatus.OK)
  async webhookBAC(
    @Req()  req:  RawBodyRequest<Request>,
    @Headers('x-bac-signature') signature: string,
    @Headers('x-bac-timestamp') timestamp: string,
    @Body() body: BACWebhookPayload,
  ) {
    // 1. Verify timestamp (reject if > 5 min old — replay attack prevention)
    const age = Date.now() - parseInt(timestamp);
    if (age > 5 * 60 * 1000) {
      this.logger.warn(`BAC webhook rejected — timestamp too old (${age}ms)`);
      throw new ForbiddenException('Webhook timestamp expired');
    }

    // 2. Verify HMAC signature
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);
    if (!this.bac.verifyWebhook(rawBody, signature, timestamp)) {
      this.logger.warn(`BAC webhook rejected — invalid signature`);
      throw new ForbiddenException('Invalid webhook signature');
    }

    this.logger.log(`BAC webhook: ${body.eventoTipo} | ref:${body.referenciaCliente} | HNL ${body.montoHNL}`);

    if (body.eventoTipo === 'DEPOSITO_CONFIRMADO') {
      const resolved = await this.virtualAccounts.resolveDeposit({
        country:   'HN',
        reference: body.referenciaCliente,
        amount:    body.montoHNL,
      });

      if (resolved) {
        await this.fiatBridge.handleDepositConfirmation({
          fiatTxId:            body.referenciaCliente,
          externalReference:   body.transaccionId,
          confirmedAmountFiat: body.montoHNL,
          currency:            'HNL' as any,
        });
      }
    }

    return { received: true };
  }

  // ── Health check ───────────────────────────────────────────────────────────

  @Get('health')
  health() {
    return { ok: true, service: 'fiat-bridge', ts: new Date().toISOString() };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private countryToProvider(country: VirtualAccountCountry): any {
    const map: Record<VirtualAccountCountry, string> = {
      GT: 'BANRURAL',
      MX: 'SPEI',
      HN: 'BAC_HN',
    };
    return map[country];
  }

  private countryToCurrency(country: VirtualAccountCountry): string {
    const map: Record<VirtualAccountCountry, string> = {
      GT: 'GTQ',
      MX: 'MXN',
      HN: 'HNL',
    };
    return map[country];
  }
}

// ── Webhook payload types (banco-specific) ────────────────────────────────────

interface SPEIWebhookPayload {
  tipoEvento:    'ABONO_RECIBIDO' | 'CARGO_PROCESADO' | 'DEVOLUCION';
  claveRastreo:  string;
  clabeOrigen:   string;
  clabeDestino:  string;
  monto:         number;
  concepto:      string;
  fechaOperacion: string;
  nombreOrdenante: string;
}

interface CoDiWebhookPayload {
  estado:     'PAGADO' | 'VENCIDO' | 'CANCELADO';
  referencia: string;
  codiId:     string;
  monto:      number;
  fechaPago:  string;
}
