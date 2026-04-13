import { create } from 'zustand';

interface Balance {
  balanceMondg: string;
  balanceMondgFormatted: string;
  balanceReservedMondg: string;
  availableMondg: string;
  balanceInCurrencies: Record<string, string>;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  direction: 'sent' | 'received';
  amountMondg: string;
  feeMondg: string;
  description?: string;
  txHash?: string;
  createdAt: string;
}

interface WalletState {
  balance: Balance | null;
  transactions: Transaction[];
  setBalance: (b: Balance) => void;
  setTransactions: (txs: Transaction[]) => void;
  appendTransactions: (txs: Transaction[]) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: null,
  transactions: [],
  setBalance: (balance) => set({ balance }),
  setTransactions: (transactions) => set({ transactions }),
  appendTransactions: (txs) => set(state => ({
    transactions: [...state.transactions, ...txs],
  })),
}));
