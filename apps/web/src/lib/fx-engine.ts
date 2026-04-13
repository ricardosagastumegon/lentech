/**
 * LEN FX Engine — Client-side
 *
 * Architecture: cada coin está anclada 1:1 a su fiat nacional.
 * La conversión usa USD como unidad interna invisible:
 *
 *   QUETZA → USD → MEXCOIN
 *
 * En producción los rates vienen del fx-engine service (puerto 3003)
 * que los obtiene de Chainlink + Open Exchange Rates + Fixer.io con fallback.
 * Aquí usamos rates base reales con variación demo.
 */

import { CoinCode } from '@/store/wallet.store';

/** USD value of 1 unit of each coin (base rates — updated by API in production) */
export const USD_RATES: Record<CoinCode, number> = {
  QUETZA:  0.12953,  // 1 GTQ  ≈ $0.1295 USD  (7.72 GTQ/USD)
  MEXCOIN: 0.05000,  // 1 MXN  ≈ $0.0500 USD  (20.00 MXN/USD)
  LEMPI:   0.04049,  // 1 HNL  ≈ $0.0405 USD  (24.70 HNL/USD)
  COLON:   1.00000,  // 1 SVC/USD = $1.00 USD
  NICORD:  0.02740,  // 1 NIO  ≈ $0.0274 USD  (36.50 NIO/USD)
  TIKAL:   0.50000,  // 1 BZD  ≈ $0.5000 USD  (2.00 BZD/USD)
  CORI:    0.00194,  // 1 CRC  ≈ $0.0019 USD  (515 CRC/USD)
  DOLAR:   1.00000,  // 1 USD  = $1.00 USD
};

/** Fee tiers (0.3% - 0.8% depending on pair and volume) */
export function getFee(from: CoinCode, to: CoinCode, amount: number): number {
  if (from === to) return 0;
  // Same regional bloc → lower fee
  const mesoamerica = new Set<CoinCode>(['QUETZA', 'LEMPI', 'COLON', 'NICORD', 'CORI', 'TIKAL']);
  if (mesoamerica.has(from) && mesoamerica.has(to)) return 0.003; // 0.3%
  if (from === 'MEXCOIN' || to === 'MEXCOIN') return 0.005;       // 0.5% with MX
  return 0.008;                                                    // 0.8% cross-region
}

export interface FXQuoteResult {
  fromCoin: CoinCode;
  toCoin: CoinCode;
  fromAmount: number;
  toAmount: number;       // after fee
  toAmountGross: number;  // before fee
  rate: number;           // 1 fromCoin = N toCoin
  rateDisplay: string;    // "1 QUETZA = 2.59 MEXCOIN"
  feePercent: number;
  feeAmount: number;      // in fromCoin
  fromUSD: number;        // USD equivalent of fromAmount
  toUSD: number;          // USD equivalent of toAmount
  midRate: number;        // mid-market rate (no fee)
  savings: number;        // vs Western Union (5.5% avg)
  validUntil: Date;
}

/**
 * Calculate FX quote between any two LEN coins.
 * Uses USD as the invisible bridge:
 *   rate = USD_RATES[from] / USD_RATES[to]
 */
export function calculateFXQuote(
  from: CoinCode,
  to: CoinCode,
  fromAmount: number,
): FXQuoteResult {
  const fromUSDRate = USD_RATES[from];
  const toUSDRate   = USD_RATES[to];

  const midRate     = fromUSDRate / toUSDRate;
  const feePercent  = getFee(from, to, fromAmount);
  const feeAmount   = fromAmount * feePercent;
  const netAmount   = fromAmount - feeAmount;

  const toAmountGross = fromAmount * midRate;
  const toAmount      = netAmount  * midRate;
  const fromUSD       = fromAmount * fromUSDRate;
  const toUSD         = toAmount   * toUSDRate;

  // What Western Union would charge (~5.5% avg)
  const wuCost    = fromAmount * 0.055 * fromUSDRate;
  const lenCost   = feeAmount * fromUSDRate;
  const savings   = wuCost - lenCost;

  const rateDisplay = `1 ${from} = ${midRate.toFixed(from === 'CORI' ? 6 : 4)} ${to}`;

  return {
    fromCoin: from,
    toCoin: to,
    fromAmount,
    toAmount,
    toAmountGross,
    rate: midRate,
    rateDisplay,
    feePercent,
    feeAmount,
    fromUSD,
    toUSD,
    midRate,
    savings: Math.max(0, savings),
    validUntil: new Date(Date.now() + 30_000), // 30s validity
  };
}

/**
 * Get all cross rates for the ticker (N most important pairs)
 */
export function getTickerRates(): Array<{
  from: CoinCode; to: CoinCode; rate: number; rateStr: string
}> {
  const pairs: [CoinCode, CoinCode][] = [
    ['QUETZA',  'MEXCOIN'],
    ['MEXCOIN', 'QUETZA'],
    ['QUETZA',  'LEMPI'],
    ['LEMPI',   'QUETZA'],
    ['MEXCOIN', 'LEMPI'],
    ['QUETZA',  'DOLAR'],
    ['MEXCOIN', 'DOLAR'],
    ['LEMPI',   'DOLAR'],
    ['QUETZA',  'COLON'],
    ['QUETZA',  'CORI'],
    ['TIKAL',   'DOLAR'],
  ];
  return pairs.map(([from, to]) => {
    const rate = USD_RATES[from] / USD_RATES[to];
    return { from, to, rate, rateStr: rate.toFixed(rate < 0.01 ? 6 : 4) };
  });
}

/** Convert an amount from one coin to USD */
export function toUSD(amount: number, coin: CoinCode): number {
  return amount * USD_RATES[coin];
}

/** Convert USD to a coin amount */
export function fromUSD(usd: number, coin: CoinCode): number {
  return usd / USD_RATES[coin];
}
