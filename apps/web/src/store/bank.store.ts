import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Bank account types by country ───────────────────────────────────────────

export type BankCountry = 'GT' | 'MX' | 'HN';

// Guatemala: IBAN 22 digits (GT + 22 alphanumeric)
// Mexico: CLABE 18 digits
// Honduras: 14-digit account number (varies per bank)

export const BANKS: Record<BankCountry, { name: string; code: string }[]> = {
  GT: [
    { name: 'Banrural',             code: 'BANRURAL' },
    { name: 'BAM',                  code: 'BAM' },
    { name: 'Industrial',           code: 'INDUSTRIAL' },
    { name: 'G&T Continental',      code: 'GYT' },
    { name: 'Banco Agromercantil',  code: 'AGRO' },
  ],
  MX: [
    { name: 'BBVA',                 code: 'BBVA' },
    { name: 'Santander',            code: 'SANTANDER' },
    { name: 'Banamex (Citibanamex)',code: 'BANAMEX' },
    { name: 'HSBC',                 code: 'HSBC' },
    { name: 'Banorte',              code: 'BANORTE' },
    { name: 'Scotiabank',           code: 'SCOTIABANK' },
    { name: 'Banco Azteca',         code: 'AZTECA' },
  ],
  HN: [
    { name: 'Banco Atlántida',      code: 'ATLANTIDA' },
    { name: 'BAC Honduras',         code: 'BAC' },
    { name: 'Ficohsa',              code: 'FICOHSA' },
    { name: 'Banco del País',       code: 'BANPAIS' },
    { name: 'Occidente',            code: 'OCCIDENTE' },
  ],
};

export const ACCOUNT_LABELS: Record<BankCountry, { field: string; format: string; length?: number; placeholder: string }> = {
  GT: {
    field: 'IBAN',
    format: 'GT + 22 caracteres',
    length: 24,
    placeholder: 'GT00 0000 0000 0000 0000 0000',
  },
  MX: {
    field: 'CLABE interbancaria',
    format: '18 dígitos',
    length: 18,
    placeholder: '000000000000000000',
  },
  HN: {
    field: 'Número de cuenta',
    format: '10–14 dígitos',
    placeholder: '00000000000000',
  },
};

export interface BankAccount {
  id: string;
  country: BankCountry;
  bankCode: string;
  bankName: string;
  accountNumber: string;  // IBAN for GT/HN, CLABE for MX
  holderName: string;     // account holder full name
  alias?: string;         // optional friendly name e.g. "Mi Banrural"
  createdAt: string;
}

interface BankState {
  accounts: BankAccount[];
  addAccount: (account: Omit<BankAccount, 'id' | 'createdAt'>) => string;
  removeAccount: (id: string) => void;
}

export const useBankStore = create<BankState>()(
  persist(
    (set) => ({
      accounts: [],

      addAccount: (account) => {
        const id = `BA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const now = new Date().toISOString();
        set(s => ({
          accounts: [{ ...account, id, createdAt: now }, ...s.accounts],
        }));
        return id;
      },

      removeAccount: (id) => set(s => ({
        accounts: s.accounts.filter(a => a.id !== id),
      })),
    }),
    {
      name: 'mondega-bank-accounts',
    }
  )
);
