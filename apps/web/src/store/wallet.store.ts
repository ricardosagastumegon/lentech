import { create } from 'zustand';

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

export interface WalletBalance {
  coin: CoinCode;
  balance: string;
  available: string;
  balanceUSD: number;
}

export interface Transaction {
  id: string;
  type: 'transfer' | 'fiat_load' | 'fiat_withdraw' | 'fx_swap' | 'fee' | 'refund' | 'purchase';
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'reversed';
  direction: 'sent' | 'received' | 'internal';
  fromCoin: CoinCode;
  toCoin: CoinCode;
  fromAmount: string;
  toAmount: string;
  fxRate?: number;
  fee: string;
  feeUSD?: number;
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
}

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  transactions: [],
  setWallets: (wallets) => set({ wallets }),
  setBalance: (data: unknown) => {
    const d = data as { wallets?: WalletBalance[]; items?: WalletBalance[] };
    set({ wallets: d?.wallets ?? d?.items ?? [] });
  },
  setTransactions: (transactions) => set({ transactions }),
  appendTransactions: (txs) => set(s => ({ transactions: [...s.transactions, ...txs] })),
}));
