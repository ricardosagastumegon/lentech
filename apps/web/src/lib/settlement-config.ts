/**
 * Modo de liquidación por país (modelo unificado — ver docs/money-architecture.md).
 *
 * - `individual`: la persona tiene su PROPIA cuenta en el banco (custodia banco↔persona).
 *                 Es el DEFAULT en los 3 países. LEN no custodia.
 * - `concentradora`: fallback para usuarios que todavía no tienen cuenta de banco propia
 *                    (los fondos caen en la cuenta única LEN del país, atribuidos por
 *                    referencia = account_number). Transicional, no el objetivo.
 *
 * Módulo PURO (sin dependencias) para evitar ciclos con users-db.
 */

export type SettlementMode     = "individual" | "concentradora";
export type RailProvider       = "conekta" | "banrural" | "bac" | "stp";
export type SettlementCountry  = "MX" | "GT" | "HN";

export interface CountrySettlement {
  default_mode:        SettlementMode;
  provider:            RailProvider;
  pool_account:        string;   // cuenta única LEN del país (solo modo concentradora / fallback)
  supports_individual: boolean;  // si el riel permite cuenta propia por usuario
}

/** Default = individual (banco↔persona) en los tres países. */
export const SETTLEMENT_MODE_POR_PAIS: Record<SettlementCountry, CountrySettlement> = {
  MX: { default_mode: "individual", provider: "conekta",  pool_account: "20200", supports_individual: true },
  GT: { default_mode: "individual", provider: "banrural", pool_account: "10100", supports_individual: true },
  HN: { default_mode: "individual", provider: "bac",      pool_account: "30300", supports_individual: true },
};

/** Modo efectivo del usuario: override del usuario > default del país. */
export function resolveSettlementMode(u: { country: string; settlement_mode?: SettlementMode | null }): SettlementMode {
  if (u.settlement_mode) return u.settlement_mode;
  return SETTLEMENT_MODE_POR_PAIS[u.country as SettlementCountry]?.default_mode ?? "individual";
}

/** Default por país (para asignar al crear usuario). */
export function defaultSettlementMode(country: string): SettlementMode {
  return SETTLEMENT_MODE_POR_PAIS[country as SettlementCountry]?.default_mode ?? "individual";
}
