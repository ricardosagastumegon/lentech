import { create } from 'zustand';

export const COINS = {
  QUETZA:  { country: 'GT', fiat: 'GTQ', name: 'Quetzal Digital',  flag: '🇬🇹', decimals: 2 },
  MEXCOIN: { country: 'MX', fiat: 'MXN', name: 'MexCoin',          flag: '🇲🇽', decimals: 2 },
  LEMPI:   { country: 'HN', fiat: 'HNL', name: 'Lempi',            flag: '🇭🇳', decimals: 2 },
  COLON:   { country: 'SV', fiat: 'USD', name: 'Colón Digital',    flag: '🇸🇻', decimals: 2 },
  NICORD:  { country: 'NI', fiat: 'NIO', name: 'NiCord',           flag: '🇳🇮', decimals: 2 },
  TIKAL:   { country: 'BZ', fiat: 'BZD', name: 'Tikal',            flag: '🇧🇿', decimals: 2 },
  CORI:    { country: 'CR', fiat: 'CRC', name: 'Cori',             flag: '🇨🇷', decimals: 2 },
  DOLAR:   { country: 'US', fiat: 'USD', name: 'Dólar Digital',    flag: '🌎', decimals: 2 },
} as const;

export type CoinCode = keyof typeof COINS;

export const COUNTRY_TO_COIN: Record<string, CoinCode> = {
  GT: 'QUETZA',
  MX: 'MEXCOIN',
  HN: 'LEMPI',
  SV: 'COLON',
  NI: 'NICORD',
  BZ: 'TIKAL',
  CR: 'CORI',
  US: 'DOLAR',
};

export interface WalletBalance {
  coin: CoinCode;
  balance: string;
  balanceUSD: number;
  available: string;
}

export interface Transaction {
  id: string;
  type: string;
  status: string;
  direction: 'sent' | 'received';
  fromCoin: CoinCode;
  toCoin: CoinCode;
  fromAmount: string;
  toAmount: string;
  fxRate?: number;
  fee: string;
  description?: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
}

interface WalletState {
  wallets: WalletBalance[];
  transactions: Transaction[];
  setWallets: (w: WalletBalance[]) => void;
  setBalance: (data: { wallets?: WalletBalance[]; items?: WalletBalance[] }) => void;
  setTransactions: (txs: Transaction[]) => void;
  appendTransactions: (txs: Transaction[]) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  transactions: [],
  setWallets: (wallets) => set({ wallets }),
  setBalance: (data) => {
    const wallets = data.wallets ?? data.items ?? [];
    set({ wallets });
  },
  setTransactions: (transactions) => set({ transactions }),
  appendTransactions: (txs) => set((state) => ({
    transactions: [...state.transactions, ...txs],
  })),
}));
