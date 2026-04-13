// ============================================================
// MONDEGA DIGITAL — Fiat Bridge Orchestrator
// Coordinates fiat deposits/withdrawals across all providers
// On deposit: receive fiat → mint MONDG → credit wallet
// On withdrawal: burn MONDG → debit wallet → send fiat
// ============================================================

import {
  Injectable, Logger, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { FiatTransaction } from './entities/fiat-transaction.entity';
import { BanruralProvider } from './providers/banrural.provider';
import { SPEIProvider } from './providers/spei.provider';
import { FiatProvider, Currency } from '@mondega/shared-types';
import { generateId, toMondgUnits } from '@mondega/shared-utils';

export interface LoadFiatDTO {
  userId: string;
  provider: FiatProvider;
  amountFiat: string;
  currency: Currency;
  // Provider-specific fields
  bankAccount?: string;    // For Banrural/SPEI
  phoneNumber?: string;    // For CoDi
  email?: string;          // For OXXO
}

export interface WithdrawFiatDTO {
  userId: string;
  provider: FiatProvider;
  amountFiat: string;
  currency: Currency;
  destinationAccount: string;
  recipientName: string;
}

@Injectable()
export class FiatBridgeService {
  private readonly logger = new Logger(FiatBridgeService.name);

  constructor(
    @InjectRepository(FiatTransaction)
    private readonly fiatTxRepo: Repository<FiatTransaction>,
    private readonly banrural: BanruralProvider,
    private readonly spei: SPEIProvider,
    @InjectQueue('fiat-bridge')
    private readonly fiatQueue: Queue,
    @InjectQueue('transactions')
    private readonly txQueue: Queue,
  ) {}

  // ---- Deposit Flow ----

  async initiateDeposit(dto: LoadFiatDTO): Promise<{
    fiatTxId: string;
    instructions: DepositInstructions;
  }> {
    const fiatTxId = generateId('ftx');

    const fiatTx = this.fiatTxRepo.create({
      id: fiatTxId,
      userId: dto.userId,
      provider: dto.provider,
      externalReference: 'pending',
      type: 'load',
      amount: dto.amountFiat,
      currency: dto.currency,
      status: 'pending',
      webhookReceived: false,
    });
    await this.fiatTxRepo.save(fiatTx);

    let instructions: DepositInstructions;

    switch (dto.provider) {
      case FiatProvider.BANRURAL: {
        const res = await this.banrural.initiateDeposit({
          referenceId: fiatTxId,
          accountNumber: dto.bankAccount!,
          amountGTQ: dto.amountFiat,
          description: `Mondega recarga ${fiatTxId}`,
        });
        await this.fiatTxRepo.update(fiatTxId, { externalReference: res.transactionId });
        instructions = {
          type: 'bank_transfer',
          details: {
            bank: 'Banrural',
            reference: fiatTxId,
            estimatedTime: '15-30 minutos',
            status: res.status,
          },
        };
        break;
      }

      case FiatProvider.SPEI: {
        const res = await this.spei.initiateSPEI({
          referenceId: fiatTxId,
          clabe: this.config_mondegaCLABE(),
          amountMXN: dto.amountFiat,
          concept: `MONDEGA ${fiatTxId.slice(-8)}`,
        });
        await this.fiatTxRepo.update(fiatTxId, { externalReference: res.ordenPagoId });
        instructions = {
          type: 'bank_transfer',
          details: {
            bank: 'SPEI',
            clabe: this.config_mondegaCLABE(),
            reference: res.claveRastreo,
            concept: `MONDEGA ${fiatTxId.slice(-8)}`,
            estimatedTime: '1-2 minutos',
          },
        };
        break;
      }

      case FiatProvider.CODI: {
        const res = await this.spei.createCoDiCharge({
          referenceId: fiatTxId,
          amountMXN: dto.amountFiat,
          concept: `Mondega recarga`,
          phoneNumber: dto.phoneNumber!,
        });
        await this.fiatTxRepo.update(fiatTxId, { externalReference: res.codiReference });
        instructions = {
          type: 'qr_code',
          details: {
            qrCodeBase64: res.qrCodeBase64,
            deepLink: res.deepLink,
            expiresAt: res.expiresAt.toISOString(),
            estimatedTime: 'Inmediato',
          },
        };
        break;
      }

      case FiatProvider.OXXO: {
        const res = await this.spei.createOXXOReference({
          referenceId: fiatTxId,
          amountMXN: dto.amountFiat,
          customerEmail: dto.email!,
          customerName: dto.userId,
        });
        await this.fiatTxRepo.update(fiatTxId, { externalReference: res.reference });
        instructions = {
          type: 'cash',
          details: {
            barcode: res.barcode,
            reference: res.reference,
            expiresAt: res.expiresAt.toISOString(),
            instructions: res.instructions,
          },
        };
        break;
      }

      default:
        throw new BadRequestException(`Unsupported fiat provider: ${dto.provider}`);
    }

    this.logger.log(`Fiat deposit initiated: ${fiatTxId} | ${dto.provider} | ${dto.currency} ${dto.amountFiat}`);

    return { fiatTxId, instructions };
  }

  // ---- Webhook Handler: Fiat received → mint MONDG ----

  async handleDepositConfirmation(params: {
    fiatTxId: string;
    externalReference: string;
    confirmedAmountFiat: string;
    currency: Currency;
  }): Promise<void> {
    const fiatTx = await this.fiatTxRepo.findOne({ where: { id: params.fiatTxId } });
    if (!fiatTx) {
      this.logger.warn(`Webhook for unknown fiatTx: ${params.fiatTxId}`);
      return;
    }

    if (fiatTx.status !== 'pending') {
      this.logger.warn(`Duplicate webhook for ${params.fiatTxId} (status: ${fiatTx.status})`);
      return;
    }

    await this.fiatTxRepo.update(params.fiatTxId, {
      status: 'processing',
      webhookReceived: true,
    });

    // Convert fiat amount to MONDG units and queue minting
    const mondgAmount = toMondgUnits(params.confirmedAmountFiat);

    await this.txQueue.add('mint-mondg', {
      userId: fiatTx.userId,
      fiatTxId: params.fiatTxId,
      mondgAmount: mondgAmount.toString(),
      currency: params.currency,
      fiatAmount: params.confirmedAmountFiat,
    }, { priority: 1 }); // High priority

    this.logger.log(
      `Fiat confirmed: ${params.fiatTxId} | ${params.currency} ${params.confirmedAmountFiat} → minting MONDG`,
    );
  }

  // ---- Withdrawal Flow ----

  async initiateWithdrawal(dto: WithdrawFiatDTO): Promise<{ fiatTxId: string; estimatedTime: string }> {
    const fiatTxId = generateId('ftx');

    // Queue withdrawal (MONDG burn happens first, then fiat sent)
    await this.fiatQueue.add('process-withdrawal', {
      fiatTxId,
      userId: dto.userId,
      provider: dto.provider,
      amountFiat: dto.amountFiat,
      currency: dto.currency,
      destinationAccount: dto.destinationAccount,
      recipientName: dto.recipientName,
    });

    const estimatedTimes: Record<string, string> = {
      [FiatProvider.BANRURAL]: '30-60 minutos',
      [FiatProvider.SPEI]: '2-5 minutos',
      [FiatProvider.BAM]: '30-60 minutos',
    };

    return {
      fiatTxId,
      estimatedTime: estimatedTimes[dto.provider] ?? '1-2 horas',
    };
  }

  private config_mondegaCLABE(): string {
    // Mondega's receiving CLABE — configured via env in production
    return process.env['MONDEGA_CLABE_MX'] ?? '000000000000000000';
  }
}

interface DepositInstructions {
  type: 'bank_transfer' | 'qr_code' | 'cash';
  details: Record<string, unknown>;
}
