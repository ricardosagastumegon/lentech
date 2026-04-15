/**
 * LEN Admin Store — parámetros operacionales del sistema
 *
 * Persiste en localStorage. En producción estos parámetros vendrían
 * de un backend admin API y requieren rol superadmin.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BankStatusType = 'live' | 'demo' | 'offline' | 'degraded';

export interface BankConnectivity {
  code:       string;
  name:       string;
  country:    'GT' | 'MX' | 'HN';
  status:     BankStatusType;
  pingMs:     number;    // simulated response time ms
  lastCheck:  string;    // ISO timestamp
  protocol:   string;    // ACH / SPEI / SIEFOM
  achCode:    string;
}

export interface SystemFees {
  tokenBuy:       number;   // 0 = 0%
  tokenSell:      number;   // 0.005 = 0.5%
  fxMesoamerica:  number;   // 0.003 = 0.3%
  fxMexico:       number;   // 0.005 = 0.5%
  fxCrossRegion:  number;   // 0.008 = 0.8%
  withdrawGT:     number;   // 0 = free
  withdrawMX:     number;
  withdrawHN:     number;
}

export interface KYCLimits {
  level0MonthlyUSD: number;
  level1MonthlyUSD: number;
  level2MonthlyUSD: number;
  level3MonthlyUSD: number;
}

export interface TxLimits {
  minSendUSD:        number;
  maxSendPerTxUSD:   number;
  maxSendDailyUSD:   number;
  minWithdrawUSD:    number;
  maxWithdrawPerTxUSD: number;
  minBuyTokensUSD:   number;
  maxBuyTokensUSD:   number;
  minSellTokensUSD:  number;
  maxSellTokensUSD:  number;
}

export interface FXRateOverride {
  coin:     string;
  usdRate:  number;
  enabled:  boolean;
  updatedAt: string;
}

export type UserStatus = 'active' | 'suspended' | 'blocked';
export type UserTag    = 'vip' | 'corporate' | 'test' | 'flagged' | 'staff';

export interface UserOverride {
  userId:      string;
  displayName: string;
  phone:       string;
  country:     string;
  kycLevel:    number;
  status:      UserStatus;
  tags:        UserTag[];
  // Límites personalizados — null = usa el global
  maxSendPerTxUSD:    number | null;
  maxSendDailyUSD:    number | null;
  maxWithdrawPerTxUSD: number | null;
  monthlyLimitUSD:    number | null;
  customFeePercent:   number | null;   // null = usa fee global
  notes:       string;
  createdAt:   string;
  updatedAt:   string;
}

export interface AdminState {
  // ── Auth ────────────────────────────────
  isAuthenticated: boolean;

  // ── System mode ─────────────────────────
  liveMode:        boolean;
  maintenanceMode: boolean;

  // ── Bank connectivity ────────────────────
  banks: BankConnectivity[];

  // ── Fees ────────────────────────────────
  fees: SystemFees;

  // ── KYC limits (USD) ────────────────────
  kycLimits: KYCLimits;

  // ── Transaction limits (USD) ─────────────
  txLimits: TxLimits;

  // ── FX rate overrides ───────────────────
  fxOverrides: FXRateOverride[];

  // ── Per-user overrides ───────────────────
  userOverrides: UserOverride[];

  // ── Actions ─────────────────────────────
  login:            (password: string) => boolean;
  logout:           () => void;
  toggleLiveMode:   () => void;
  toggleMaintenance:() => void;
  setBankStatus:    (code: string, status: BankStatusType) => void;
  pingBank:         (code: string) => void;
  setFees:          (fees: Partial<SystemFees>) => void;
  setKYCLimits:     (limits: Partial<KYCLimits>) => void;
  setTxLimits:      (limits: Partial<TxLimits>) => void;
  setFXOverride:    (coin: string, rate: number, enabled: boolean) => void;
  pingAllBanks:     () => void;
  upsertUserOverride: (override: Omit<UserOverride, 'createdAt' | 'updatedAt'> & { createdAt?: string }) => void;
  setUserStatus:    (userId: string, status: UserStatus) => void;
  removeUserOverride: (userId: string) => void;
}

// ── Default bank list ─────────────────────────────────────────────────────────
const DEFAULT_BANKS: BankConnectivity[] = [
  // Guatemala — ACH BANGUAT via Banrural
  { code: 'INDUSTRIAL',   name: 'Banco Industrial',           country: 'GT', status: 'live',  pingMs: 42,  lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1001' },
  { code: 'BANRURAL',     name: 'Banrural',                   country: 'GT', status: 'live',  pingMs: 38,  lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1002' },
  { code: 'BAM',          name: 'BAM (Agromercantil)',        country: 'GT', status: 'live',  pingMs: 55,  lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1003' },
  { code: 'GYT',          name: 'G&T Continental',            country: 'GT', status: 'live',  pingMs: 61,  lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1004' },
  { code: 'BANTRAB',      name: 'Banco de los Trabajadores',  country: 'GT', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1005' },
  { code: 'PROMERICA_GT', name: 'Promerica Guatemala',        country: 'GT', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1008' },
  { code: 'CITI_GT',      name: 'Citibank Guatemala',         country: 'GT', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'ACH BANGUAT', achCode: '1009' },
  // Mexico — SPEI via STP
  { code: 'BBVA',         name: 'BBVA México',                country: 'MX', status: 'live',  pingMs: 29,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '012' },
  { code: 'SANTANDER',    name: 'Santander',                  country: 'MX', status: 'live',  pingMs: 31,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '014' },
  { code: 'BANAMEX',      name: 'Citibanamex',                country: 'MX', status: 'live',  pingMs: 33,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '002' },
  { code: 'BANORTE',      name: 'Banorte',                    country: 'MX', status: 'live',  pingMs: 27,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '072' },
  { code: 'HSBC',         name: 'HSBC',                       country: 'MX', status: 'live',  pingMs: 44,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '021' },
  { code: 'NU',           name: 'Nu (Nubank)',                 country: 'MX', status: 'live',  pingMs: 22,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '638' },
  { code: 'MERCADOPAGO',  name: 'Mercado Pago',               country: 'MX', status: 'live',  pingMs: 25,  lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '722' },
  { code: 'SCOTIABANK',   name: 'Scotiabank',                  country: 'MX', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '044' },
  { code: 'AZTECA',       name: 'Banco Azteca',               country: 'MX', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'SPEI/STP',    achCode: '127' },
  // Honduras — SIEFOM via BAC
  { code: 'ATLANTIDA',    name: 'Banco Atlántida',            country: 'HN', status: 'live',  pingMs: 68,  lastCheck: new Date().toISOString(), protocol: 'SIEFOM',      achCode: '2001' },
  { code: 'BAC',          name: 'BAC Credomatic Honduras',    country: 'HN', status: 'live',  pingMs: 52,  lastCheck: new Date().toISOString(), protocol: 'SIEFOM',      achCode: '2002' },
  { code: 'FICOHSA',      name: 'Ficohsa',                    country: 'HN', status: 'live',  pingMs: 71,  lastCheck: new Date().toISOString(), protocol: 'SIEFOM',      achCode: '2003' },
  { code: 'BANPAIS',      name: 'Banco del País',             country: 'HN', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'SIEFOM',      achCode: '2004' },
  { code: 'DAVIVIENDA',   name: 'Davivienda Honduras',        country: 'HN', status: 'demo',  pingMs: 0,   lastCheck: new Date().toISOString(), protocol: 'SIEFOM',      achCode: '2008' },
];

const DEFAULT_FEES: SystemFees = {
  tokenBuy:      0,
  tokenSell:     0.005,
  fxMesoamerica: 0.003,
  fxMexico:      0.005,
  fxCrossRegion: 0.008,
  withdrawGT:    0,
  withdrawMX:    0,
  withdrawHN:    0,
};

const DEFAULT_KYC: KYCLimits = {
  level0MonthlyUSD: 200,
  level1MonthlyUSD: 1000,
  level2MonthlyUSD: 10000,
  level3MonthlyUSD: 0,  // 0 = sin límite
};

const DEFAULT_TX: TxLimits = {
  minSendUSD:          1,
  maxSendPerTxUSD:     5000,
  maxSendDailyUSD:     10000,
  minWithdrawUSD:      10,
  maxWithdrawPerTxUSD: 5000,
  minBuyTokensUSD:     1,
  maxBuyTokensUSD:     10000,
  minSellTokensUSD:    1,
  maxSellTokensUSD:    10000,
};

const DEFAULT_FX: FXRateOverride[] = [
  { coin: 'QUETZA',  usdRate: 0.12953, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'MEXCOIN', usdRate: 0.05000, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'LEMPI',   usdRate: 0.04049, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'COLON',   usdRate: 1.00000, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'NICORD',  usdRate: 0.02740, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'TIKAL',   usdRate: 0.50000, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'CORI',    usdRate: 0.00194, enabled: false, updatedAt: new Date().toISOString() },
  { coin: 'DOLAR',   usdRate: 1.00000, enabled: false, updatedAt: new Date().toISOString() },
];

const DEFAULT_USER_OVERRIDES: UserOverride[] = [
  {
    userId: 'demo-gt', displayName: 'Carlos Mendoza', phone: '+50211111', country: 'GT', kycLevel: 2,
    status: 'active', tags: ['test'],
    maxSendPerTxUSD: null, maxSendDailyUSD: null, maxWithdrawPerTxUSD: null,
    monthlyLimitUSD: null, customFeePercent: null,
    notes: 'Usuario demo Guatemala',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    userId: 'demo-mx', displayName: 'Sofía Hernández', phone: '+52122222', country: 'MX', kycLevel: 2,
    status: 'active', tags: ['test'],
    maxSendPerTxUSD: null, maxSendDailyUSD: null, maxWithdrawPerTxUSD: null,
    monthlyLimitUSD: null, customFeePercent: null,
    notes: 'Usuario demo México',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    userId: 'demo-hn', displayName: 'José Reyes', phone: '+50433333', country: 'HN', kycLevel: 2,
    status: 'active', tags: ['test'],
    maxSendPerTxUSD: null, maxSendDailyUSD: null, maxWithdrawPerTxUSD: null,
    monthlyLimitUSD: null, customFeePercent: null,
    notes: 'Usuario demo Honduras',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const ADMIN_PASSWORD = 'len2025';

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      liveMode:        false,
      maintenanceMode: false,
      banks:           DEFAULT_BANKS,
      fees:            DEFAULT_FEES,
      kycLimits:       DEFAULT_KYC,
      txLimits:        DEFAULT_TX,
      fxOverrides:     DEFAULT_FX,
      userOverrides:   DEFAULT_USER_OVERRIDES,

      login: (password) => {
        if (password === ADMIN_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false }),

      toggleLiveMode: () => set(s => ({ liveMode: !s.liveMode })),

      toggleMaintenance: () => set(s => ({ maintenanceMode: !s.maintenanceMode })),

      setBankStatus: (code, status) => set(s => ({
        banks: s.banks.map(b => b.code === code
          ? { ...b, status, pingMs: status === 'live' ? Math.floor(20 + Math.random() * 80) : 0, lastCheck: new Date().toISOString() }
          : b
        ),
      })),

      pingBank: (code) => {
        const bank = get().banks.find(b => b.code === code);
        if (!bank || bank.status !== 'live') return;
        const pingMs = Math.floor(20 + Math.random() * 100);
        set(s => ({
          banks: s.banks.map(b => b.code === code
            ? { ...b, pingMs, lastCheck: new Date().toISOString() }
            : b
          ),
        }));
      },

      pingAllBanks: () => {
        set(s => ({
          banks: s.banks.map(b => b.status === 'live'
            ? { ...b, pingMs: Math.floor(20 + Math.random() * 100), lastCheck: new Date().toISOString() }
            : b
          ),
        }));
      },

      setFees: (fees) => set(s => ({ fees: { ...s.fees, ...fees } })),

      setKYCLimits: (limits) => set(s => ({ kycLimits: { ...s.kycLimits, ...limits } })),

      setTxLimits: (limits) => set(s => ({ txLimits: { ...s.txLimits, ...limits } })),

      setFXOverride: (coin, rate, enabled) => set(s => ({
        fxOverrides: s.fxOverrides.map(fx => fx.coin === coin
          ? { ...fx, usdRate: rate, enabled, updatedAt: new Date().toISOString() }
          : fx
        ),
      })),

      upsertUserOverride: (override) => set(s => {
        const now = new Date().toISOString();
        const existing = s.userOverrides.find(u => u.userId === override.userId);
        if (existing) {
          return {
            userOverrides: s.userOverrides.map(u =>
              u.userId === override.userId
                ? { ...override, createdAt: u.createdAt, updatedAt: now }
                : u
            ),
          };
        }
        return {
          userOverrides: [
            { ...override, createdAt: override.createdAt ?? now, updatedAt: now },
            ...s.userOverrides,
          ],
        };
      }),

      setUserStatus: (userId, status) => set(s => ({
        userOverrides: s.userOverrides.map(u =>
          u.userId === userId ? { ...u, status, updatedAt: new Date().toISOString() } : u
        ),
      })),

      removeUserOverride: (userId) => set(s => ({
        userOverrides: s.userOverrides.filter(u => u.userId !== userId),
      })),
    }),
    { name: 'len-admin-config' }
  )
);
