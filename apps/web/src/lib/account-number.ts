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
