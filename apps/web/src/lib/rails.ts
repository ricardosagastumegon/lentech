/**
 * CountryRail — adapter por país (modelo unificado, ver docs/money-architecture.md).
 *
 * Lo ÚNICO que ramifica por país: coin, proveedor del riel, banco, ruteo de depósito
 * y formato de cuenta. El núcleo (ledger, invariante, sagas) NUNCA hace `if (country)`:
 * llama `getRail(country)`. Agregar/cambiar un país = tocar SU adapter, no el resto.
 *
 * Hoy cubre coin + ruteo de depósito + validación de cuenta. Futuro (cuando haya API
 * real del banco): provisionAccount / verifyWebhook / parseSettlement / payout.
 */
import type { CoinCode } from "@/store/wallet.store";
import type { SettlementMode, RailProvider } from "@/lib/settlement-config";
import { isHomologated, LEN_POOL_ACCOUNT } from "@/lib/account-number";

interface RailUser {
  country:              string;
  account_number?:      string | null;
  bank_account_number?: string | null;
  account_type?:        "virtual" | "bank" | null;
}

export interface DepositRoutingInfo {
  mode:      SettlementMode;     // individual (cuenta propia) | concentradora (pool + referencia)
  bank:      string;
  account:   string;
  reference: string | null;
}

export interface CountryRail {
  readonly country:   "MX" | "GT" | "HN";
  readonly coin:      CoinCode;
  readonly provider:  RailProvider;
  readonly bankName:  string;
  depositRouting(user: RailUser): DepositRoutingInfo;
  validateAccountNumber(acc: string): boolean;
}

// Ruteo común: homologado → su cuenta propia (individual); si no → pool + referencia (concentradora/fallback).
function route(bank: string, poolCountry: keyof typeof LEN_POOL_ACCOUNT, user: RailUser): DepositRoutingInfo {
  if (isHomologated(user)) {
    return { mode: "individual", bank, account: user.bank_account_number as string, reference: null };
  }
  return { mode: "concentradora", bank, account: LEN_POOL_ACCOUNT[poolCountry].account, reference: user.account_number ?? null };
}

const banrural: CountryRail = {
  country: "GT", coin: "QUETZA", provider: "banrural", bankName: "Banrural",
  depositRouting: (u) => route("Banrural", "GT", u),
  validateAccountNumber: (a) => { const n = a.replace(/\D/g, ""); return n.length >= 8 && n.length <= 16; },
};

const conekta: CountryRail = {
  country: "MX", coin: "MEXCOIN", provider: "conekta", bankName: "Conekta / STP",
  depositRouting: (u) => route("Conekta / STP", "MX", u),
  validateAccountNumber: (a) => a.replace(/\D/g, "").length === 18, // CLABE
};

const bac: CountryRail = {
  country: "HN", coin: "LEMPI", provider: "bac", bankName: "BAC",
  depositRouting: (u) => route("BAC", "HN", u),
  validateAccountNumber: (a) => { const n = a.replace(/\D/g, ""); return n.length >= 8 && n.length <= 16; },
};

const RAILS: Record<string, CountryRail> = { GT: banrural, MX: conekta, HN: bac };

/** Adapter del país. LANZA si el país no está soportado (nunca defaultea silenciosamente). */
export function getRail(country: string): CountryRail {
  const r = RAILS[country];
  if (!r) throw new Error(`COUNTRY_UNSUPPORTED: ${country}`);
  return r;
}

/** Atajo: el coin del país (fuente única — reemplaza los COUNTRY_COIN duplicados en las rutas). */
export function railCoin(country: string): CoinCode {
  return getRail(country).coin;
}
