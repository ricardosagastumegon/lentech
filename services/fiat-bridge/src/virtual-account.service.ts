// ============================================================
// LEN — Virtual Account Service
//
// LEGAL MODEL:
//   LEN Technologies Inc. (Delaware) owns the software.
//   LEN Red Digital S.A. (Guatemala) operates the platform
//   under license and issues tokens.
//
// GT / HN — FIDEICOMISO model (NOT pool account):
//   - LEN GT S.A. is fideicomitente
//   - Each user is fideicomisario (beneficiary)
//   - Bank (Banrural / BAC) is fiduciario
//   - User deposits GTQ/HNL → goes to trust, NOT to LEN
//   - LEN issues QUETZA/LEMPI tokens as digital representation
//   - Zero financial intermediation — user buys a token, not deposits
//
// MX — STP SUB-CLABE model:
//   - LEN holds a master CLABE range from STP/Conekta
//   - Each user gets their own unique 18-digit CLABE
//   - MXN deposited to user's CLABE stays IN that sub-account
//   - LEN instructs STP to issue MEXCOIN tokens
//   - On withdrawal: LEN instructs STP SPEI → any MX bank
//   - Zero intermediation: funds are in user's CLABE, not LEN's
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VirtualAccount, VirtualAccountCountry } from './entities/virtual-account.entity';

// ─── Country configuration ────────────────────────────────────────────────────
const COUNTRY_CONFIG: Record<VirtualAccountCountry, {
  model:       'fideicomiso' | 'clabe';
  institution: string;   // who holds the reserve
  currency:    string;
  coinCode:    string;
  trustAccount?: string; // fideicomiso master account (GT/HN)
  clabePrefix?: string;  // STP CLABE range prefix (MX)
}> = {
  GT: {
    model:        'fideicomiso',
    institution:  'Banrural (fiduciario)',
    currency:     'GTQ',
    coinCode:     'QUETZA',
    trustAccount: process.env['BANRURAL_FIDEICOMISO_ACCOUNT'] ?? '1832-2383738-',
    // Each user's sub-account: 1832-2383738-XXXX (last 4 = wallet suffix)
  },
  MX: {
    model:        'clabe',
    institution:  'STP / Conekta (sub-CLABE)',
    currency:     'MXN',
    coinCode:     'MEXCOIN',
    clabePrefix:  process.env['STP_CLABE_PREFIX'] ?? '646180',
    // Each user gets unique CLABE: 646180 + 11 user digits + check digit
    // Funds stay in user's CLABE sub-account at STP — not in LEN's account
  },
  HN: {
    model:        'fideicomiso',
    institution:  'BAC Credomatic (fiduciario)',
    currency:     'HNL',
    coinCode:     'LEMPI',
    trustAccount: process.env['BAC_FIDEICOMISO_ACCOUNT'] ?? '3090-2847561-',
    // Each user's sub-account: 3090-2847561-XXXX (last 4 = wallet suffix)
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

  // ── Get or create — idempotent ────────────────────────────────────────────

  async getOrCreate(userId: string, country: VirtualAccountCountry): Promise<VirtualAccount> {
    const existing = await this.repo.findOne({ where: { userId, country } });
    if (existing) return existing;
    return this.create(userId, country);
  }

  // ── Create virtual account ────────────────────────────────────────────────

  async create(userId: string, country: VirtualAccountCountry): Promise<VirtualAccount> {
    const cfg    = COUNTRY_CONFIG[country];
    const suffix = this.walletSuffix(userId);

    const account = this.repo.create({
      id:      `va_${country.toLowerCase()}_${userId.slice(-6)}_${crypto.randomBytes(3).toString('hex')}`,
      userId,
      country,
      // GT/HN: fideicomiso sub-account number (master + suffix)
      // MX:    CLABE virtual unique to this user
      accountReference: country === 'MX'
        ? await this.allocateCLABE(userId)
        : `${cfg.trustAccount}${suffix}`,
      clabe: country === 'MX' ? await this.allocateCLABE(userId) : undefined,
      poolAccount:  cfg.trustAccount ?? cfg.clabePrefix ?? '',
      bankCode:     cfg.institution,
      status:       'active',
      kycLevelRequired: 1,
    });

    try {
      await this.repo.save(account);
      this.logger.log(
        `Virtual account created [${cfg.model}]: ${account.id} | ${country} | user:${userId}`,
      );
      return account;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        return this.repo.findOneOrFail({ where: { userId, country } });
      }
      throw err;
    }
  }

  // ── Deposit instructions — what the app shows the user ────────────────────

  async getDepositInstructions(userId: string, country: VirtualAccountCountry): Promise<{
    model:         string;
    institution:   string;
    displayAccount: string;
    copyValue:     string;
    currency:      string;
    coinCode:      string;
    accountLabel:  string;
    subLabel:      string;
    legalNote:     string;
    minAmount:     string;
    maxDaily:      string;
    eta:           string;
  }> {
    const va  = await this.getOrCreate(userId, country);
    const cfg = COUNTRY_CONFIG[country];

    if (country === 'MX') {
      return {
        model:          'STP sub-CLABE',
        institution:    'STP — Red SPEI',
        displayAccount: va.clabe ?? va.accountReference,
        copyValue:      va.clabe ?? va.accountReference,
        currency:       'MXN',
        coinCode:       'MEXCOIN',
        accountLabel:   'Tu CLABE LEN exclusiva',
        subLabel:       'Desde CUALQUIER banco mexicano vía SPEI',
        legalNote:      'Tu MXN queda en tu sub-cuenta STP — nunca en una cuenta de LEN. LEN emite MEXCOIN como representación digital 1:1.',
        minAmount:      '$50 MXN',
        maxDaily:       '$200,000 MXN',
        eta:            'Inmediato (SPEI 24/7)',
      };
    }

    return {
      model:          'Fideicomiso bancario',
      institution:    cfg.institution,
      displayAccount: va.accountReference,
      copyValue:      va.accountReference.replace(/-/g, ''),
      currency:       cfg.currency,
      coinCode:       cfg.coinCode,
      accountLabel:   `Tu cuenta LEN en ${country === 'GT' ? 'Banrural' : 'BAC'} (fideicomiso)`,
      subLabel:       `Desde CUALQUIER banco de ${country === 'GT' ? 'Guatemala' : 'Honduras'}`,
      legalNote:      `Tu ${cfg.currency} va al fideicomiso LEN — custodia bancaria regulada, no cuenta de LEN. LEN emite ${cfg.coinCode} como activo digital 1:1.`,
      minAmount:      country === 'GT' ? 'Q 50' : 'L 500',
      maxDaily:       country === 'GT' ? 'Q 25,000' : 'L 100,000',
      eta:            '15–30 min (L-V hábil)',
    };
  }

  // ── Resolve incoming deposit to user ──────────────────────────────────────

  async resolveDeposit(params: {
    country:   VirtualAccountCountry;
    reference: string;
    clabe?:    string;
    amount:    string;
  }): Promise<{ userId: string; virtualAccount: VirtualAccount } | null> {

    let account: VirtualAccount | null = null;

    if (params.country === 'MX' && params.clabe) {
      account = await this.repo.findOne({
        where: { clabe: params.clabe, status: 'active' },
      });
    } else {
      account = await this.repo.findOne({
        where: {
          accountReference: params.reference.toUpperCase(),
          country:          params.country,
          status:           'active',
        },
      });
    }

    if (!account) {
      this.logger.warn(
        `Deposit unresolved: ref=${params.reference} clabe=${params.clabe} country=${params.country}`,
      );
      return null;
    }

    await this.repo.update(account.id, {
      totalDeposited: () => `"total_deposited" + ${parseFloat(params.amount)}`,
    });

    return { userId: account.userId, virtualAccount: account };
  }

  // ── Deterministic wallet suffix (last 4 digits for GT/HN sub-account) ────

  private walletSuffix(userId: string): string {
    const hash = crypto.createHash('sha256').update(`LEN-SUFFIX-${userId}`).digest('hex');
    return parseInt(hash.slice(0, 8), 16).toString().slice(0, 4).padStart(4, '0');
  }

  // ── Allocate MX CLABE (deterministic for demo, API call in production) ───
  // Production: POST to STP/Conekta API to register and get a real CLABE.
  // Each CLABE is the user's own sub-account in STP's system.

  private async allocateCLABE(userId: string): Promise<string> {
    const prefix = this.config.get('STP_CLABE_PREFIX', '646180');
    const hash   = crypto.createHash('sha256').update(`LEN-MX-CLABE-${userId}`).digest('hex');
    const digits = parseInt(hash.slice(0, 15), 16).toString().slice(0, 11).padStart(11, '0');
    const base17 = `${prefix}${digits}`;
    const check  = this.clabeCheckDigit(base17);
    return `${base17}${check}`;
  }

  private clabeCheckDigit(clabe17: string): string {
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    const sum     = clabe17.split('').reduce((acc, d, i) => acc + (parseInt(d) * weights[i]) % 10, 0);
    return String((10 - (sum % 10)) % 10);
  }
}
