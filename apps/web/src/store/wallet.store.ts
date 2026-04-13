import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const COINS = {
  // ── PHASE 1 — ACTIVE ──────────────────────────────────────────
  QUETZA:  { country: 'GT', fiat: 'GTQ', name: 'Quetzal Digital',  flag: '🇬🇹', symbol: 'Q',  active: true,  phase: 1 },
  MEXCOIN: { country: 'MX', fiat: 'MXN', name: 'MexCoin',          flag: '🇲🇽', symbol: '$',  active: true,  phase: 1 },
  LEMPI:   { country: 'HN', fiat: 'HNL', name: 'Lempi',            flag: '🇭🇳', symbol: 'L',  active: true,  phase: 1 },
  // ── PHASE 2 — COMING SOON (hidden from user, visible in admin) ─
  COLON:   { country: 'SV', fiat: 'USD', name: 'Colón Digital',    flag: '🇸🇻', symbol: '$',  active: false, phase: 2 },
  DOLAR:   { country: 'US', fiat: 'USD', name: 'Dólar Digital',    flag: '🌎', symbol: '$',  active: false, phase: 2 },
  // ── PHASE 3 — FUTURE ──────────────────────────────────────────
  TIKAL:   { country: 'BZ', fiat: 'BZD', name: 'Tikal',            flag: '🇧🇿', symbol: '$',  active: false, phase: 3 },
  NICORD:  { country: 'NI', fiat: 'NIO', name: 'NiCord',           flag: '🇳🇮', symbol: 'C$', active: false, phase: 3 },
  CORI:    { country: 'CR', fiat: 'CRC', name: 'Cori',             flag: '🇨🇷', symbol: '₡',  active: false, phase: 3 },
} as const;

export type CoinCode = keyof typeof COINS;

/** Only Phase 1 active coins */
export const ACTIVE_COINS = (Object.entries(COINS) as [CoinCode, typeof COINS[CoinCode]][])
  .filter(([, m]) => m.active)
  .map(([code]) => code);

export const COUNTRY_TO_COIN: Record<string, CoinCode> = {
  GT: 'QUETZA',
  MX: 'MEXCOIN',
  HN: 'LEMPI',
  SV: 'COLON',
  US: 'DOLAR',
  BZ: 'TIKAL',
  NI: 'NICORD',
  CR: 'CORI',
};

// ─── Token exchange fees ────────────────────────────────────────────────────
// Infrastructure for commission on token buy/sell.
// Business decision: charge on one side (buy OR sell) — both slots exist for compliance.
// Rates TBD pending legal review. Set to 0 until confirmed.
export const TOKEN_FEES = {
  BUY: {
    percent: 0,        // % of fiat amount charged when buying tokens
    label: '0%',
    note: 'Sin comisión de entrada',
  },
  SELL: {
    percent: 0.005,    // 0.5% — charged when selling tokens back to fiat
    label: '0.5%',
    note: 'Comisión estándar de salida',
  },
} as const;

export interface WalletBalance {
  coin: CoinCode;
  // ── Token balance ──────────────────────────────────────────────
  balance: string;       // total token balance (QUETZA)
  available: string;     // tokens available (not reserved in pending txs)
  // ── Fiat balance (deposited, not yet converted to tokens) ──────
  fiatBalance: string;   // GTQ/MXN/HNL received from user's bank, pending token purchase
  fiatCurrency: string;  // 'GTQ' | 'MXN' | 'HNL' — matches COINS[coin].fiat
  // ── Legacy / internal ─────────────────────────────────────────
  balanceUSD: number;    // internal only — never shown to user
}

export interface Transaction {
  id: string;
  type: 'transfer' | 'fiat_load' | 'fiat_withdraw' | 'fx_swap' | 'fee' | 'refund' | 'purchase'
      | 'token_buy' | 'token_sell';
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'reversed';
  direction: 'sent' | 'received' | 'internal';
  fromCoin: CoinCode;
  toCoin: CoinCode;
  fromAmount: string;
  toAmount: string;
  fxRate?: number;
  fee: string;
  feeUSD?: number;
  feePercent?: number;   // for token_buy / token_sell
  description?: string;
  recipientName?: string;
  senderName?: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
}

interface WalletState {
  wallets: WalletBalance[];
  transactions: Transaction[];
  setWallets: (w: WalletBalance[]) => void;
  setBalance: (data: unknown) => void;
  setTransactions: (txs: Transaction[]) => void;
  appendTransactions: (txs: Transaction[]) => void;
  // Token exchange actions (client-side demo — production hits wallet-service API)
  buyTokens: (coinCode: CoinCode, fiatAmount: number) => void;
  sellTokens: (coinCode: CoinCode, tokenAmount: number) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (set, _get) => ({
  wallets: [],
  transactions: [],

  setWallets: (wallets) => set({ wallets }),

  setBalance: (data: unknown) => {
    const d = data as { wallets?: WalletBalance[]; items?: WalletBalance[] };
    set({ wallets: d?.wallets ?? d?.items ?? [] });
  },

  setTransactions: (transactions) => set({ transactions }),

  appendTransactions: (txs) => set(s => ({ transactions: [...s.transactions, ...txs] })),

  // ── Buy tokens: convert fiat → tokens ──────────────────────────────────────
  // fee = TOKEN_FEES.BUY.percent (currently 0)
  // tokensReceived = fiatAmount × (1 - buyFee) — always 1:1 after fee
  buyTokens: (coinCode: CoinCode, fiatAmount: number) => {
    const fee        = fiatAmount * TOKEN_FEES.BUY.percent;
    const netTokens  = fiatAmount - fee;
    const now        = new Date().toISOString();

    set(s => {
      const wallets = s.wallets.map(w => {
        if (w.coin !== coinCode) return w;
        const newFiat   = Math.max(0, parseFloat(w.fiatBalance) - fiatAmount);
        const newTokens = parseFloat(w.available) + netTokens;
        return {
          ...w,
          fiatBalance: newFiat.toFixed(2),
          balance:     newTokens.toFixed(2),
          available:   newTokens.toFixed(2),
        };
      });

      const tx: Transaction = {
        id:          `tx-buy-${Date.now()}`,
        type:        'token_buy',
        status:      'completed',
        direction:   'internal',
        fromCoin:    coinCode,
        toCoin:      coinCode,
        fromAmount:  fiatAmount.toFixed(2),
        toAmount:    netTokens.toFixed(2),
        fee:         fee.toFixed(4),
        feePercent:  TOKEN_FEES.BUY.percent,
        description: `Compra ${netTokens.toFixed(2)} ${coinCode} · ${TOKEN_FEES.BUY.label}`,
        createdAt:   now,
        completedAt: now,
      };

      return { wallets, transactions: [tx, ...s.transactions] };
    });
  },

  // ── Sell tokens: convert tokens → fiat ─────────────────────────────────────
  // fee = TOKEN_FEES.SELL.percent (currently 0.5%)
  // fiatReceived = tokenAmount × (1 - sellFee) — 1:1 minus fee
  sellTokens: (coinCode: CoinCode, tokenAmount: number) => {
    const fee         = tokenAmount * TOKEN_FEES.SELL.percent;
    const netFiat     = tokenAmount - fee;
    const now         = new Date().toISOString();

    set(s => {
      const wallets = s.wallets.map(w => {
        if (w.coin !== coinCode) return w;
        const newTokens = Math.max(0, parseFloat(w.available) - tokenAmount);
        const newFiat   = parseFloat(w.fiatBalance) + netFiat;
        return {
          ...w,
          balance:     newTokens.toFixed(2),
          available:   newTokens.toFixed(2),
          fiatBalance: newFiat.toFixed(2),
        };
      });

      const tx: Transaction = {
        id:          `tx-sell-${Date.now()}`,
        type:        'token_sell',
        status:      'completed',
        direction:   'internal',
        fromCoin:    coinCode,
        toCoin:      coinCode,
        fromAmount:  tokenAmount.toFixed(2),
        toAmount:    netFiat.toFixed(2),
        fee:         fee.toFixed(4),
        feePercent:  TOKEN_FEES.SELL.percent,
        description: `Venta ${tokenAmount.toFixed(2)} ${coinCode} · ${TOKEN_FEES.SELL.label}`,
        createdAt:   now,
        completedAt: now,
      };

      return { wallets, transactions: [tx, ...s.transactions] };
    });
  },
  }),
  {
    name: 'mondega-wallet',
    partialize: (state) => ({
      wallets:      state.wallets,
      transactions: state.transactions,
    }),
  },
));
