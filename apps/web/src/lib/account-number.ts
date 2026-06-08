/**
 * Numeración y homologación de cuentas LEN ↔ Banrural.
 *
 * Modelo: cada usuario tiene un `account_number` interno (canónico) que funciona
 * como sub-cuenta (Opción 1). Si Banrural abre una cuenta real, se guarda en
 * `bank_account_number` y la cuenta queda HOMOLOGADA (Opción 2). La reconciliación
 * usa la clave canónica `bank_account_number ?? account_number`, de modo que el
 * ledger y el banco hablan el mismo identificador en ambos modelos.
 *
 * Módulo PURO (sin dependencias) para evitar ciclos con users-db.
 */
import { randomBytes } from "crypto";

export type AccountType = "virtual" | "bank";

// Prefijo de pool por país (la cuenta interna cuelga del pool de LEN en cada banco).
const POOL_PREFIX: Record<string, string> = { GT: "10", MX: "20", HN: "30" };

/**
 * Genera un número de cuenta interno: <pool_país><6 dígitos>.
 * Ej. GT → "10" + "101001" → "10101001".
 * (Formato ajustable para calzar con el esquema real de Banrural en homologación.)
 */
export function generateAccountNumber(country: string): string {
  const pool = POOL_PREFIX[country] ?? "90";
  const n = (parseInt(randomBytes(4).toString("hex"), 16) % 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${pool}${n}`;
}

/** Clave canónica de la cuenta: la real de Banrural si está homologada, si no la interna. */
export function canonicalAccount(u: {
  bank_account_number?: string | null;
  account_number?: string | null;
}): string | null {
  return u.bank_account_number || u.account_number || null;
}

/** ¿La cuenta ya está homologada a una cuenta Banrural real? */
export function isHomologated(u: { account_type?: AccountType | null; bank_account_number?: string | null }): boolean {
  return u.account_type === "bank" && !!u.bank_account_number;
}

// Cuenta única (pool) de LEN por país — donde caen los fondos de usuarios `virtual`.
export const LEN_POOL_ACCOUNT: Record<string, { bank: string; account: string }> = {
  GT: { bank: "Banrural", account: "10100" },
  MX: { bank: "STP/SPEI", account: "20200" },
  HN: { bank: "BAC",      account: "30300" },
};

export interface DepositRouting {
  mode:      "own" | "pooled";   // own = cuenta Banrural propia (homologada); pooled = cuenta única LEN
  bank:      string;
  account:   string;             // a qué cuenta deposita
  reference: string | null;      // referencia (su account_number interno) si es pooled
}

/**
 * Híbrido: decide a qué cuenta deposita un usuario.
 * - Homologado (account_type=bank) → su propia cuenta Banrural, sin referencia.
 * - Virtual → la cuenta única LEN del país, usando su account_number como referencia.
 */
export function depositRouting(u: {
  country: string;
  account_type?: AccountType | null;
  account_number?: string | null;
  bank_account_number?: string | null;
}): DepositRouting {
  if (isHomologated(u)) {
    return { mode: "own", bank: "Banrural", account: u.bank_account_number as string, reference: null };
  }
  const pool = LEN_POOL_ACCOUNT[u.country] ?? LEN_POOL_ACCOUNT.GT;
  return { mode: "pooled", bank: pool.bank, account: pool.account, reference: u.account_number ?? null };
}
