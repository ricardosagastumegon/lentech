import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BankCountry = 'GT' | 'MX' | 'HN';

// ─── Deposit model per country ────────────────────────────────────────────────
// GT/HN: LEN has a master account at Banrural/BAC.
//        Each user wallet gets a virtual sub-account (last digits = wallet ID).
//        User transfers from their personal bank TO their LEN sub-account.
// MX:    Each user gets a unique CLABE virtual (18 digits) via STP/Conekta.
//        User transfers from any MX bank to their CLABE. Auto-identified.

// ─── ALL banks in system — used for WITHDRAWALS ───────────────────────────────
// GT:  LEN sends via Banrural → TELERED/ACH BANGUAT → reaches ANY Guatemalan bank
// MX:  LEN sends via SPEI → reaches ALL ~50 SPEI participant banks
// HN:  LEN sends via BAC → SIEFOM interbank → reaches ALL Honduran banks

export const BANKS: Record<BankCountry, { name: string; code: string; achCode?: string }[]> = {
  GT: [
    { name: 'Banco Industrial',            code: 'INDUSTRIAL',   achCode: '1001' },
    { name: 'Banrural',                    code: 'BANRURAL',     achCode: '1002' },
    { name: 'BAM (Banco Agromercantil)',   code: 'BAM',          achCode: '1003' },
    { name: 'G&T Continental',             code: 'GYT',          achCode: '1004' },
    { name: 'Banco de los Trabajadores',   code: 'BANTRAB',      achCode: '1005' },
    { name: 'Vivibanco',                   code: 'VIVIBANCO',    achCode: '1006' },
    { name: 'Banpaís',                     code: 'BANPAIS_GT',   achCode: '1007' },
    { name: 'Promerica Guatemala',         code: 'PROMERICA_GT', achCode: '1008' },
    { name: 'Citibank Guatemala',          code: 'CITI_GT',      achCode: '1009' },
    { name: 'Ficohsa Guatemala',           code: 'FICOHSA_GT',   achCode: '1010' },
    { name: 'Inmobanco',                   code: 'INMOBANCO',    achCode: '1011' },
    { name: 'Banco Reformador',            code: 'REFORMADOR',   achCode: '1012' },
    { name: 'Banrural (Agencia)',          code: 'BANRURAL_AG',  achCode: '1013' },
  ],
  MX: [
    // SPEI — alcanza todos los bancos participantes (~50+)
    { name: 'BBVA México',                 code: 'BBVA',         achCode: '012' },
    { name: 'Santander',                   code: 'SANTANDER',    achCode: '014' },
    { name: 'Banamex (Citibanamex)',       code: 'BANAMEX',      achCode: '002' },
    { name: 'HSBC',                        code: 'HSBC',         achCode: '021' },
    { name: 'Banorte',                     code: 'BANORTE',      achCode: '072' },
    { name: 'Scotiabank',                  code: 'SCOTIABANK',   achCode: '044' },
    { name: 'Banco Azteca',               code: 'AZTECA',       achCode: '127' },
    { name: 'Inbursa',                     code: 'INBURSA',      achCode: '036' },
    { name: 'Afirme',                      code: 'AFIRME',       achCode: '062' },
    { name: 'BanBajío',                    code: 'BANBAJIO',     achCode: '030' },
    { name: 'Banca Mifel',                 code: 'MIFEL',        achCode: '042' },
    { name: 'Nu (Nubank)',                 code: 'NU',           achCode: '638' },
    { name: 'Mercado Pago',               code: 'MERCADOPAGO',  achCode: '722' },
    { name: 'Spin by OXXO',              code: 'SPIN',         achCode: '706' },
    { name: 'Hey Banco',                  code: 'HEY',          achCode: '058' },
    { name: 'Otro banco SPEI',            code: 'OTRO_MX',      achCode: '000' },
  ],
  HN: [
    { name: 'Banco Atlántida',            code: 'ATLANTIDA',    achCode: '2001' },
    { name: 'BAC Credomatic Honduras',    code: 'BAC',          achCode: '2002' },
    { name: 'Ficohsa',                    code: 'FICOHSA',      achCode: '2003' },
    { name: 'Banco del País (BANPAIS)',   code: 'BANPAIS',      achCode: '2004' },
    { name: 'Occidente',                  code: 'OCCIDENTE',    achCode: '2005' },
    { name: 'Banco de Honduras',          code: 'BANHONDURAS',  achCode: '2006' },
    { name: 'BANHCAFE',                   code: 'BANHCAFE',     achCode: '2007' },
    { name: 'Davivienda Honduras',        code: 'DAVIVIENDA',   achCode: '2008' },
    { name: 'Promerica Honduras',         code: 'PROMERICA_HN', achCode: '2009' },
    { name: 'Lafise Honduras',            code: 'LAFISE',       achCode: '2010' },
  ],
};

// ─── Account field labels by country ─────────────────────────────────────────
// GT: Número de cuenta (varies by bank: 10–16 digits. IBAN format optional)
// MX: CLABE interbancaria 18 digits (REQUIRED for SPEI)
// HN: Número de cuenta (10–14 digits)

export const ACCOUNT_LABELS: Record<BankCountry, {
  field:       string;
  format:      string;
  length?:     number;
  placeholder: string;
  hint:        string;
}> = {
  GT: {
    field:       'Número de cuenta',
    format:      '10–16 dígitos',
    placeholder: '0000000000000000',
    hint:        'Número de cuenta en tu banco guatemalteco. Sin guiones ni espacios.',
  },
  MX: {
    field:       'CLABE interbancaria',
    format:      '18 dígitos exactos',
    length:      18,
    placeholder: '000000000000000000',
    hint:        'La CLABE de 18 dígitos de tu banco mexicano. La encuentras en tu app bancaria.',
  },
  HN: {
    field:       'Número de cuenta',
    format:      '10–14 dígitos',
    placeholder: '00000000000000',
    hint:        'Número de cuenta en tu banco hondureño. Sin guiones ni espacios.',
  },
};

// ─── Deposit instructions per country (shown in add-money screen) ─────────────
// GT: LEN sub-account at Banrural. Last digits = wallet suffix.
// MX: CLABE virtual unique per user (auto-generated by STP).
// HN: LEN sub-account at BAC. Last digits = wallet suffix.
export const DEPOSIT_MODEL: Record<BankCountry, {
  type:        'sub-account' | 'clabe' | 'reference';
  bank:        string;
  poolAccount: string;    // LEN's master account (shown as base)
  currency:    string;
  note:        string;
}> = {
  GT: {
    type:        'sub-account',
    bank:        'Banrural',
    poolAccount: '1832-2383738-',   // + last 4 wallet digits
    currency:    'GTQ',
    note:        'Los últimos 4 dígitos son únicos de tu wallet. Puedes depositar desde CUALQUIER banco guatemalteco a esta cuenta.',
  },
  MX: {
    type:        'clabe',
    bank:        'STP (Red SPEI)',
    poolAccount: '646180',           // STP prefix + 12 user digits + check digit
    currency:    'MXN',
    note:        'Tu CLABE es única. Transfiere desde CUALQUIER banco mexicano. El depósito llega en segundos.',
  },
  HN: {
    type:        'sub-account',
    bank:        'BAC Credomatic',
    poolAccount: '3090-2847561-',   // + last 4 wallet digits
    currency:    'HNL',
    note:        'Los últimos 4 dígitos son únicos de tu wallet. Puedes depositar desde CUALQUIER banco hondureño a esta cuenta.',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BankAccount {
  id:            string;
  country:       BankCountry;
  bankCode:      string;
  bankName:      string;
  accountNumber: string;   // account number (GT/HN) or CLABE (MX)
  holderName:    string;
  alias?:        string;
  createdAt:     string;
}

interface BankState {
  accounts:      BankAccount[];
  addAccount:    (account: Omit<BankAccount, 'id' | 'createdAt'>) => string;
  removeAccount: (id: string) => void;
}

export const useBankStore = create<BankState>()(
  persist(
    (set) => ({
      accounts: [],

      addAccount: (account) => {
        const id  = `BA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const now = new Date().toISOString();
        set(s => ({ accounts: [{ ...account, id, createdAt: now }, ...s.accounts] }));
        return id;
      },

      removeAccount: (id) => set(s => ({
        accounts: s.accounts.filter(a => a.id !== id),
      })),
    }),
    { name: 'mondega-bank-accounts' }
  )
);
