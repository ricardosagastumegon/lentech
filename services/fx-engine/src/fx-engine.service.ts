// ============================================================
// MONDEGA DIGITAL — FX Engine (TypeScript/NestJS)
// Manages real-time exchange rates between all digital coins.
//
// Architecture:
//   Each digital coin is pegged 1:1 to its fiat.
//   All conversions route through USD as internal unit.
//   The user always sees their local coin — USD is invisible.
//
//   MEXCOIN → QUETZA:
//     1. Get MXN/USD rate from oracle  (e.g. 0.0504)
//     2. Get GTQ/USD rate from oracle  (e.g. 0.1286)
//     3. rate = MXN_USD / GTQ_USD      (e.g. 0.3920 QUETZA per MEXCOIN)
//     4. Apply fee, return result
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import {
  DigitalCoin, FiatCurrency, FEE_SCHEDULE, FeeType,
  getCoin, getActiveCoins, getAllPairs,
} from '@mondega/shared-types/currencies';

// Rate TTL: rates older than this are considered stale
const RATE_TTL_SECONDS = 60;
const RATE_CACHE_KEY = (fiat: FiatCurrency) => `fx:rate:usd:${fiat}`;
const PAIR_CACHE_KEY = (from: DigitalCoin, to: DigitalCoin) => `fx:pair:${from}:${to}`;
const QUOTE_PREFIX = 'fx:quote:';
const QUOTE_TTL = 30; // Quote valid for 30 seconds — user must confirm within this

export interface FXRate {
  fiat: FiatCurrency;
  usdRate: number;       // How many USD = 1 unit of this fiat
  inverseRate: number;   // How many of this fiat = 1 USD
  source: string;
  fetchedAt: Date;
  isStale: boolean;
}

export interface FXQuote {
  quoteId: string;
  fromCoin: DigitalCoin;
  toCoin: DigitalCoin;
  fromAmount: number;
  toAmount: number;
  rate: number;           // Direct pair rate: fromCoin → toCoin
  rateDisplay: string;    // e.g. "1 MEXCOIN = 0.3920 QUETZA"
  feeType: FeeType;
  feeAmount: number;      // In fromCoin units
  feePercent: number;
  usdEquivalent: number;  // Total value in USD
  validUntil: Date;
  lockedRate: boolean;
}

export interface ConversionResult {
  fromCoin: DigitalCoin;
  toCoin: DigitalCoin;
  fromAmount: number;
  toAmountGross: number;  // Before fee
  feeAmount: number;
  toAmountNet: number;    // What recipient gets
  rate: number;
  usdEquivalent: number;
}

@Injectable()
export class FXEngineService {
  private readonly logger = new Logger(FXEngineService.name);

  // Fallback rates (used when oracle is unavailable — updated daily by ops team)
  private readonly FALLBACK_RATES: Record<FiatCurrency, number> = {
    [FiatCurrency.GTQ]: 0.1286,
    [FiatCurrency.MXN]: 0.0504,
    [FiatCurrency.HNL]: 0.0403,
    [FiatCurrency.SVC]: 0.1143,
    [FiatCurrency.NIO]: 0.0275,
    [FiatCurrency.BZD]: 0.4950,
    [FiatCurrency.CRC]: 0.00195,
    [FiatCurrency.USD]: 1.0000,
  };

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  // ---- Rate Fetching (runs every 60 seconds via cron) ----

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshAllRates(): Promise<void> {
    this.logger.debug('Refreshing FX rates from oracle...');
    for (const fiat of Object.values(FiatCurrency)) {
      try {
        await this.fetchAndCacheRate(fiat);
      } catch (err) {
        this.logger.warn(`Failed to fetch rate for ${fiat}, using fallback`);
      }
    }
  }

  private async fetchAndCacheRate(fiat: FiatCurrency): Promise<number> {
    if (fiat === FiatCurrency.USD) {
      // USD is always 1:1 — no need to fetch
      const rateData: FXRate = {
        fiat, usdRate: 1.0, inverseRate: 1.0,
        source: 'fixed', fetchedAt: new Date(), isStale: false,
      };
      await this.redis.setex(RATE_CACHE_KEY(fiat), RATE_TTL_SECONDS * 2, JSON.stringify(rateData));
      return 1.0;
    }

    let usdRate: number | null = null;
    let source = 'fallback';

    // Provider 1: OpenExchangeRates (primary — free tier, 1000 req/month)
    const openExchangeKey = this.config.get<string>('OPENEXCHANGERATES_APP_ID');
    if (openExchangeKey) {
      try {
        const res = await axios.get(
          `https://openexchangerates.org/api/latest.json?app_id=${openExchangeKey}&base=USD&symbols=${fiat}`,
          { timeout: 5000 },
        );
        const rawRate = res.data?.rates?.[fiat]; // This is USD→fiat, e.g. USD→GTQ = 7.77
        if (rawRate && rawRate > 0) {
          usdRate = 1 / rawRate; // Convert to fiat→USD (e.g. 1 GTQ = 0.1286 USD)
          source = 'openexchangerates';
        }
      } catch (err) {
        this.logger.warn(`OpenExchangeRates failed for ${fiat}: ${(err as Error).message}`);
      }
    }

    // Provider 2: Fixer.io (secondary fallback)
    if (!usdRate) {
      const fixerKey = this.config.get<string>('FIXER_API_KEY');
      if (fixerKey) {
        try {
          const res = await axios.get(
            `https://data.fixer.io/api/latest?access_key=${fixerKey}&base=EUR&symbols=USD,${fiat}`,
            { timeout: 5000 },
          );
          const rates = res.data?.rates;
          if (rates?.USD && rates?.[fiat]) {
            // Both rates relative to EUR, so cross: fiat/USD = rates[fiat]/rates[USD]
            // Then fiat→USD = rates[USD]/rates[fiat]
            usdRate = rates.USD / rates[fiat];
            source = 'fixer';
          }
        } catch (err) {
          this.logger.warn(`Fixer.io failed for ${fiat}: ${(err as Error).message}`);
        }
      }
    }

    // Provider 3: ExchangeRate.host (free, no key required)
    if (!usdRate) {
      try {
        const res = await axios.get(
          `https://api.exchangerate.host/latest?base=USD&symbols=${fiat}`,
          { timeout: 5000 },
        );
        const rawRate = res.data?.rates?.[fiat];
        if (rawRate && rawRate > 0) {
          usdRate = 1 / rawRate;
          source = 'exchangerate.host';
        }
      } catch (err) {
        this.logger.warn(`ExchangeRate.host failed for ${fiat}: ${(err as Error).message}`);
      }
    }

    // Final fallback: last known hardcoded rate (updated by ops team)
    if (!usdRate) {
      usdRate = this.FALLBACK_RATES[fiat] ?? 1.0;
      source = 'hardcoded_fallback';
      this.logger.error(`All FX providers failed for ${fiat} — using hardcoded fallback ${usdRate}`);
    }

    const rateData: FXRate = {
      fiat,
      usdRate,
      inverseRate: 1 / usdRate,
      source,
      fetchedAt: new Date(),
      isStale: false,
    };

    await this.redis.setex(
      RATE_CACHE_KEY(fiat),
      RATE_TTL_SECONDS * 2,
      JSON.stringify(rateData),
    );

    this.logger.debug(`FX rate cached: 1 ${fiat} = ${usdRate.toFixed(6)} USD (source: ${source})`);
    return usdRate;
  }

  async getRate(fiat: FiatCurrency): Promise<FXRate> {
    const cached = await this.redis.get(RATE_CACHE_KEY(fiat));

    if (cached) {
      const rate = JSON.parse(cached) as FXRate;
      const ageMs = Date.now() - new Date(rate.fetchedAt).getTime();
      rate.isStale = ageMs > RATE_TTL_SECONDS * 1000;
      return rate;
    }

    // Not in cache — fetch immediately
    const usdRate = await this.fetchAndCacheRate(fiat);
    return {
      fiat,
      usdRate,
      inverseRate: 1 / usdRate,
      source: 'fallback_immediate',
      fetchedAt: new Date(),
      isStale: false,
    };
  }

  // ---- Core Conversion Logic ----

  async convert(
    fromCoin: DigitalCoin,
    toCoin: DigitalCoin,
    fromAmount: number,
    feeType: FeeType = 'p2p_cross_coin',
  ): Promise<ConversionResult> {
    if (fromAmount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    const fromDef = getCoin(fromCoin);
    const toDef = getCoin(toCoin);

    // Get both rates in USD
    const fromRate = await this.getRate(fromDef.fiatPeg);
    const toRate = await this.getRate(toDef.fiatPeg);

    // Calculate cross rate: how many toCoin per 1 fromCoin
    // e.g. MEXCOIN→QUETZA: (MXN_USD / GTQ_USD) = (0.0504 / 0.1286) = 0.3919
    const crossRate = fromRate.usdRate / toRate.usdRate;

    // Gross amount (before fee)
    const toAmountGross = fromAmount * crossRate;

    // Apply fee
    const feePercent = FEE_SCHEDULE[feeType];
    const feeAmount = fromAmount * feePercent;
    const fromAmountAfterFee = fromAmount - feeAmount;
    const toAmountNet = fromAmountAfterFee * crossRate;

    // USD equivalent (for AML limit checking)
    const usdEquivalent = fromAmount * fromRate.usdRate;

    return {
      fromCoin,
      toCoin,
      fromAmount,
      toAmountGross,
      feeAmount,
      toAmountNet,
      rate: crossRate,
      usdEquivalent,
    };
  }

  // ---- Quote (rate-locked for 30 seconds) ----

  async createQuote(
    fromCoin: DigitalCoin,
    toCoin: DigitalCoin,
    fromAmount: number,
    feeType: FeeType = 'p2p_cross_coin',
  ): Promise<FXQuote> {
    const result = await this.convert(fromCoin, toCoin, fromAmount, feeType);
    const fromDef = getCoin(fromCoin);
    const toDef = getCoin(toCoin);

    const quoteId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const validUntil = new Date(Date.now() + QUOTE_TTL * 1000);

    const quote: FXQuote = {
      quoteId,
      fromCoin,
      toCoin,
      fromAmount,
      toAmount: result.toAmountNet,
      rate: result.rate,
      rateDisplay: `1 ${fromDef.code} = ${result.rate.toFixed(4)} ${toDef.code}`,
      feeType,
      feeAmount: result.feeAmount,
      feePercent: FEE_SCHEDULE[feeType] * 100,
      usdEquivalent: result.usdEquivalent,
      validUntil,
      lockedRate: true,
    };

    // Store quote in Redis (locked rate, expires in 30 seconds)
    await this.redis.setex(
      `${QUOTE_PREFIX}${quoteId}`,
      QUOTE_TTL,
      JSON.stringify({ ...quote, lockedCrossRate: result.rate }),
    );

    return quote;
  }

  async consumeQuote(quoteId: string): Promise<FXQuote & { lockedCrossRate: number }> {
    const key = `${QUOTE_PREFIX}${quoteId}`;
    const raw = await this.redis.get(key);

    if (!raw) {
      throw new BadRequestException('Quote expired or not found. Please request a new quote.');
    }

    const quote = JSON.parse(raw) as FXQuote & { lockedCrossRate: number };

    // Delete quote so it can only be used once
    await this.redis.del(key);

    return quote;
  }

  // ---- Reverse calculation: "I want X QUETZA, how much MEXCOIN do I need?" ----

  async convertReverse(
    fromCoin: DigitalCoin,
    toCoin: DigitalCoin,
    toAmount: number,  // Desired amount in toCoin
    feeType: FeeType = 'p2p_cross_coin',
  ): Promise<ConversionResult> {
    const fromDef = getCoin(fromCoin);
    const toDef = getCoin(toCoin);

    const fromRate = await this.getRate(fromDef.fiatPeg);
    const toRate = await this.getRate(toDef.fiatPeg);

    const crossRate = fromRate.usdRate / toRate.usdRate;
    const feePercent = FEE_SCHEDULE[feeType];

    // Work backwards: toAmount = (fromAmount - fee) * rate
    // fromAmount - fromAmount * fee = toAmount / rate
    // fromAmount * (1 - fee) = toAmount / rate
    // fromAmount = (toAmount / rate) / (1 - fee)
    const fromAmountNeeded = (toAmount / crossRate) / (1 - feePercent);
    const feeAmount = fromAmountNeeded * feePercent;

    return {
      fromCoin,
      toCoin,
      fromAmount: fromAmountNeeded,
      toAmountGross: toAmount,
      feeAmount,
      toAmountNet: toAmount,
      rate: crossRate,
      usdEquivalent: fromAmountNeeded * fromRate.usdRate,
    };
  }

  // ---- Rate table: all active pairs ----

  async getRateTable(): Promise<Array<{
    fromCoin: DigitalCoin;
    toCoin: DigitalCoin;
    rate: number;
    rateDisplay: string;
    change24h: number;  // placeholder until historical data available
  }>> {
    const pairs = getAllPairs();
    const results = [];

    for (const [from, to] of pairs) {
      try {
        const result = await this.convert(from, to, 1, 'p2p_cross_coin');
        results.push({
          fromCoin: from,
          toCoin: to,
          rate: result.rate,
          rateDisplay: `1 ${from} = ${result.rate.toFixed(4)} ${to}`,
          change24h: 0, // TODO: implement with historical data
        });
      } catch {
        // Skip pairs where rates unavailable
      }
    }

    return results;
  }

  // ---- Quick display rate (for UI, no fee applied) ----

  async getDisplayRate(fromCoin: DigitalCoin, toCoin: DigitalCoin): Promise<number> {
    const fromDef = getCoin(fromCoin);
    const toDef = getCoin(toCoin);
    const fromRate = await this.getRate(fromDef.fiatPeg);
    const toRate = await this.getRate(toDef.fiatPeg);
    return fromRate.usdRate / toRate.usdRate;
  }

  // ---- Format amount for display ----

  formatAmount(amount: number, coin: DigitalCoin): string {
    const def = getCoin(coin);
    return `${def.symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: def.decimals,
      maximumFractionDigits: def.decimals,
    })} ${def.code}`;
  }
}
