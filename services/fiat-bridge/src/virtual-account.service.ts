// ============================================================
// LEN — Virtual Account Service
// Generates and manages dedicated bank accounts per user.
//
// GT: Banrural pool account + unique 8-char reference per user
// MX: CLABE virtual 18 digits per user (via STP/Conekta)
// HN: BAC pool account + unique 8-char reference per user
//
// When a user deposits to their virtual account, the bank
// notifies LEN via webhook → we credit their wallet.
// ============================================================

import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VirtualAccount, VirtualAccountCountry } from './entities/virtual-account.entity';

// Country config — pool accounts and routing info
const COUNTRY_CONFIG: Record<VirtualAccountCountry, {
  bankCode:    string;
  poolAccount: string;
  currency:    string;
  coinCode:    string;
}> = {
  GT: {
    bankCode:    'BANRURAL',
    poolAccount: process.env['BANRURAL_LEN_ACCOUNT'] ?? '3010-0000-GT-LEN',
    currency:    'GTQ',
    coinCode:    'QUETZA',
  },
  MX: {
    bankCode:    'STP',
    poolAccount: process.env['STP_LEN_CLABE'] ?? '646180000000000000',
    currency:    'MXN',
    coinCode:    'MEXCOIN',
  },
  HN: {
    bankCode:    'BAC_HN',
    poolAccount: process.env['BAC_LEN_ACCOUNT'] ?? '3090-0000-HN-LEN',
    currency:    'HNL',
    coinCode:    'LEMPI',
  },
};

@Injectable()
export class VirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);

  constructor(
    @InjectRepository(VirtualAccount)
    private readonly repo: Repository<VirtualAccount>,
    private readonly config: ConfigService,
  ) {}

  // ── Get or create virtual account for a user ──────────────────────────────
  // Called on user registration or first deposit attempt.
  // Idempotent: returns existing account if already created.

  async getOrCreate(userId: string, country: VirtualAccountCountry): Promise<VirtualAccount> {
    const existing = await this.repo.findOne({
      where: { userId, country },
    });
    if (existing) return existing;

    return this.create(userId, country);
  }

  // ── Create virtual account ─────────────────────────────────────────────────

  async create(userId: string, country: VirtualAccountCountry): Promise<VirtualAccount> {
    const cfg = COUNTRY_CONFIG[country];
    const ref = this.generateReference(userId, country);

    const account = this.repo.create({
      id:               `va_${country.toLowerCase()}_${userId.slice(-6)}_${crypto.randomBytes(3).toString('hex')}`,
      userId,
      country,
      accountReference: ref,
      clabe:            country === 'MX' ? await this.allocateCLABE(userId) : undefined,
      poolAccount:      cfg.poolAccount,
      bankCode:         cfg.bankCode,
      status:           'active',
      kycLevelRequired: 1,
    });

    try {
      await this.repo.save(account);
      this.logger.log(`Virtual account created: ${account.id} | ${country} | user:${userId}`);
      return account;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        // Race condition — return existing
        return this.repo.findOneOrFail({ where: { userId, country } });
      }
      throw err;
    }
  }

  // ── Get deposit instructions for a user ───────────────────────────────────
  // Returns what to show the user in the app: where to send money.

  async getDepositInstructions(userId: string, country: VirtualAccountCountry): Promise<{
    method:      string;
    bankName:    string;
    account:     string;       // CLABE (MX) or pool account (GT/HN)
    reference:   string;       // CRITICAL — user must include this
    currency:    string;
    coinCode:    string;
    minAmount:   string;
    maxDaily:    string;
    eta:         string;
  }> {
    const va  = await this.getOrCreate(userId, country);
    const cfg = COUNTRY_CONFIG[country];

    const instructions = {
      GT: {
        method:    'Transferencia bancaria',
        bankName:  'Banrural (cuenta LEN)',
        account:   va.poolAccount,
        reference: va.accountReference,
        currency:  'GTQ',
        coinCode:  'QUETZA',
        minAmount: 'Q 50',
        maxDaily:  'Q 25,000',
        eta:       '15–30 min (L-V hábil)',
      },
      MX: {
        method:    'SPEI (cualquier banco MX)',
        bankName:  'STP — Red LEN',
        account:   va.clabe ?? va.accountReference,  // CLABE virtual única
        reference: va.accountReference,
        currency:  'MXN',
        coinCode:  'MEXCOIN',
        minAmount: '$50 MXN',
        maxDaily:  '$200,000 MXN',
        eta:       'Inmediato (SPEI 24/7)',
      },
      HN: {
        method:    'Transferencia bancaria',
        bankName:  'BAC Honduras (cuenta LEN)',
        account:   va.poolAccount,
        reference: va.accountReference,
        currency:  'HNL',
        coinCode:  'LEMPI',
        minAmount: 'L 500',
        maxDaily:  'L 100,000',
        eta:       '30–60 min (L-V hábil)',
      },
    };

    return instructions[country];
  }

  // ── Resolve incoming deposit to user ──────────────────────────────────────
  // Called by webhook handler. Finds which user a deposit belongs to.

  async resolveDeposit(params: {
    country:   VirtualAccountCountry;
    reference: string;        // reference in transfer concept
    clabe?:    string;        // MX only — destination CLABE
    amount:    string;
  }): Promise<{ userId: string; virtualAccount: VirtualAccount } | null> {

    let account: VirtualAccount | null = null;

    if (params.country === 'MX' && params.clabe) {
      // MX: match by CLABE (each user has unique CLABE)
      account = await this.repo.findOne({ where: { clabe: params.clabe, status: 'active' } });
    } else {
      // GT/HN: match by reference in transfer concept
      account = await this.repo.findOne({
        where: { accountReference: params.reference.toUpperCase(), country: params.country, status: 'active' },
      });
    }

    if (!account) {
      this.logger.warn(`Deposit resolution failed: no account for ref=${params.reference} country=${params.country}`);
      return null;
    }

    // Update lifetime stats
    await this.repo.update(account.id, {
      totalDeposited: () => `"total_deposited" + ${parseFloat(params.amount)}`,
    });

    return { userId: account.userId, virtualAccount: account };
  }

  // ── Generate deterministic 8-char reference ────────────────────────────────
  // Deterministic so we can re-derive it if needed, unique per user+country.

  private generateReference(userId: string, country: VirtualAccountCountry): string {
    const seed = crypto.createHash('sha256').update(`LEN-${country}-${userId}`).digest('hex');
    const num  = parseInt(seed.slice(0, 10), 16).toString().slice(0, 8).padStart(8, '0');
    return `${country}${num}`; // e.g. GT00423891, MX98234012, HN45672301
  }

  // ── Allocate CLABE for MX user ─────────────────────────────────────────────
  // In production: calls STP/Conekta API to generate a real CLABE.
  // Here: generates a deterministic virtual CLABE for demo/staging.

  private async allocateCLABE(userId: string): Promise<string> {
    // Production: POST to STP /cuentas/virtuales → get real CLABE
    // Demo/staging: derive from userId hash
    const hash   = crypto.createHash('sha256').update(`LEN-MX-CLABE-${userId}`).digest('hex');
    const digits = parseInt(hash.slice(0, 15), 16).toString().slice(0, 12).padStart(12, '0');
    // STP institution code: 646180 (Conekta) + 12 digits + Luhnn check
    const base   = `646180${digits}`;
    const check  = this.clabeCheckDigit(base);
    return `${base}${check}`;
  }

  // CLABE Luhnn check digit (Banxico standard)
  private clabeCheckDigit(clabe17: string): string {
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    const sum = clabe17.split('').reduce((acc, d, i) => acc + (parseInt(d) * weights[i]) % 10, 0);
    return String((10 - (sum % 10)) % 10);
  }
}
