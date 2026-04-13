// ============================================================
// MONDEGA DIGITAL — Currency Registry
// Defines all digital currencies in the Mondega ecosystem
// Each coin is pegged 1:1 to its national fiat currency
// ============================================================

export enum DigitalCoin {
  QUETZA  = 'QUETZA',   // Guatemala     — Quetzal Digital
  MEXCOIN = 'MEXCOIN',  // México        — MexCoin
  LEMPI   = 'LEMPI',    // Honduras      — Lempi
  COLON   = 'COLON',    // El Salvador   — Colón Digital
  NICORD  = 'NICORD',   // Nicaragua     — NiCord
  TIKAL   = 'TIKAL',    // Belice        — Tikal
  CORI    = 'CORI',     // Costa Rica    — Cori
  DOLAR   = 'DOLAR',    // Regional      — Dólar Digital
}

export enum FiatCurrency {
  GTQ = 'GTQ',  // Guatemalan Quetzal
  MXN = 'MXN',  // Mexican Peso
  HNL = 'HNL',  // Honduran Lempira
  SVC = 'SVC',  // Salvadoran Colón (pegged to USD)
  NIO = 'NIO',  // Nicaraguan Córdoba
  BZD = 'BZD',  // Belize Dollar
  CRC = 'CRC',  // Costa Rican Colón
  USD = 'USD',  // US Dollar
}

export interface CoinDefinition {
  code: DigitalCoin;
  name: string;               // Full name of the digital coin
  symbol: string;             // Display symbol
  fiatPeg: FiatCurrency;      // The fiat currency it mirrors 1:1
  country: string;
  countryCode: string;        // ISO 3166-1 alpha-2
  flag: string;               // Emoji flag
  decimals: number;           // Decimal places for display
  description: string;
  color: string;              // Brand color (hex)
  isActive: boolean;
  launchPhase: 1 | 2 | 3;    // Which phase this coin launches in
}

// ---- The Mondega Coin Registry ----

export const COIN_REGISTRY: Record<DigitalCoin, CoinDefinition> = {

  [DigitalCoin.QUETZA]: {
    code: DigitalCoin.QUETZA,
    name: 'Quetzal Digital',
    symbol: 'Q̈',
    fiatPeg: FiatCurrency.GTQ,
    country: 'Guatemala',
    countryCode: 'GT',
    flag: '🇬🇹',
    decimals: 2,
    description: 'Moneda digital oficial del ecosistema Mondega para Guatemala. 1 QUETZA = 1 GTQ',
    color: '#0D6E3E',
    isActive: true,
    launchPhase: 1,
  },

  [DigitalCoin.MEXCOIN]: {
    code: DigitalCoin.MEXCOIN,
    name: 'MexCoin',
    symbol: 'M̈',
    fiatPeg: FiatCurrency.MXN,
    country: 'México',
    countryCode: 'MX',
    flag: '🇲🇽',
    decimals: 2,
    description: 'Moneda digital de México en el ecosistema Mondega. 1 MEXCOIN = 1 MXN',
    color: '#8B0000',
    isActive: true,
    launchPhase: 1,
  },

  [DigitalCoin.LEMPI]: {
    code: DigitalCoin.LEMPI,
    name: 'Lempi',
    symbol: 'L̈',
    fiatPeg: FiatCurrency.HNL,
    country: 'Honduras',
    countryCode: 'HN',
    flag: '🇭🇳',
    decimals: 2,
    description: 'Moneda digital de Honduras. Nombre inspirado en los Lempiras. 1 LEMPI = 1 HNL',
    color: '#003B8E',
    isActive: true,
    launchPhase: 2,
  },

  [DigitalCoin.COLON]: {
    code: DigitalCoin.COLON,
    name: 'Colón Digital',
    symbol: 'C̈',
    fiatPeg: FiatCurrency.SVC,
    country: 'El Salvador',
    countryCode: 'SV',
    flag: '🇸🇻',
    decimals: 2,
    description: 'Moneda digital de El Salvador, en homenaje al Colón histórico. 1 COLON = 1 USD (tipo de cambio fijo El Salvador)',
    color: '#0A3D6B',
    isActive: true,
    launchPhase: 2,
  },

  [DigitalCoin.NICORD]: {
    code: DigitalCoin.NICORD,
    name: 'NiCord',
    symbol: 'Ñ',
    fiatPeg: FiatCurrency.NIO,
    country: 'Nicaragua',
    countryCode: 'NI',
    flag: '🇳🇮',
    decimals: 2,
    description: 'Moneda digital de Nicaragua. Combinación de Ni(caragua) + Cór(doba). 1 NICORD = 1 NIO',
    color: '#2B5EA7',
    isActive: false,
    launchPhase: 2,
  },

  [DigitalCoin.TIKAL]: {
    code: DigitalCoin.TIKAL,
    name: 'Tikal',
    symbol: 'T̈',
    fiatPeg: FiatCurrency.BZD,
    country: 'Belice',
    countryCode: 'BZ',
    flag: '🇧🇿',
    decimals: 2,
    description: 'Moneda digital de Belice, nombrada en honor a la ciudad maya. 1 TIKAL = 1 BZD',
    color: '#003F87',
    isActive: false,
    launchPhase: 3,
  },

  [DigitalCoin.CORI]: {
    code: DigitalCoin.CORI,
    name: 'Cori',
    symbol: 'Ö',
    fiatPeg: FiatCurrency.CRC,
    country: 'Costa Rica',
    countryCode: 'CR',
    flag: '🇨🇷',
    decimals: 2,
    description: 'Moneda digital de Costa Rica. Diminutivo del Colón costarricense. 1 CORI = 1 CRC',
    color: '#CE1126',
    isActive: false,
    launchPhase: 2,
  },

  [DigitalCoin.DOLAR]: {
    code: DigitalCoin.DOLAR,
    name: 'Dólar Digital',
    symbol: 'Ð',
    fiatPeg: FiatCurrency.USD,
    country: 'Regional',
    countryCode: 'US',
    flag: '🌎',
    decimals: 2,
    description: 'Versión digital del dólar americano. Moneda de reserva del ecosistema. 1 DOLAR = 1 USD',
    color: '#1A5C3A',
    isActive: true,
    launchPhase: 1,
  },
};

// ---- Helper functions ----

export function getCoin(code: DigitalCoin): CoinDefinition {
  const coin = COIN_REGISTRY[code];
  if (!coin) throw new Error(`Unknown coin: ${code}`);
  return coin;
}

export function getActiveCoins(): CoinDefinition[] {
  return Object.values(COIN_REGISTRY).filter(c => c.isActive);
}

export function getCoinByFiat(fiat: FiatCurrency): CoinDefinition | undefined {
  return Object.values(COIN_REGISTRY).find(c => c.fiatPeg === fiat);
}

export function getAllPairs(): Array<[DigitalCoin, DigitalCoin]> {
  const active = getActiveCoins().map(c => c.code);
  const pairs: Array<[DigitalCoin, DigitalCoin]> = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      pairs.push([active[i]!, active[j]!]);
    }
  }
  return pairs;
}

// ---- Fee schedule per operation type ----

export const FEE_SCHEDULE = {
  p2p_same_coin:    0.003,  // 0.3% — same coin transfer (e.g. QUETZA → QUETZA)
  p2p_cross_coin:   0.006,  // 0.6% — cross-coin transfer (e.g. MEXCOIN → QUETZA)
  purchase:         0.005,  // 0.5% — buy digital coin with fiat
  redemption:       0.005,  // 0.5% — sell digital coin for fiat
  b2b_commercial:   0.008,  // 0.8% — large commercial transactions
  remittance:       0.006,  // 0.6% — family remittances
  fiat_load_bank:   0.000,  // 0.0% — free bank transfer load
  fiat_load_card:   0.015,  // 1.5% — card load (processor cost)
  fiat_load_cash:   0.010,  // 1.0% — cash agent load (OXXO etc.)
} as const;

export type FeeType = keyof typeof FEE_SCHEDULE;

// ---- KYC limits per coin (in USD equivalent) ----

export const KYC_LIMITS = {
  0: { daily: 50,    monthly: 200,    singleTx: 50    },  // Anonymous
  1: { daily: 200,   monthly: 1000,   singleTx: 200   },  // Basic (phone + ID)
  2: { daily: 2000,  monthly: 10000,  singleTx: 2000  },  // Verified (full KYC)
  3: { daily: 100000,monthly: 1000000,singleTx: 100000},  // Business
} as const;
