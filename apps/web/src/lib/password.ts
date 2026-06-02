/**
 * Hashing seguro de PINs/contraseñas usando scrypt (Node.js built-in).
 *
 * Algoritmo: scrypt (RFC 7914) — diseñado contra ataques de hardware especializado.
 * Parámetros: N=16384, r=8, p=1, keyLen=64 — recomendados por OWASP 2024.
 *
 * Formato almacenado: `scrypt:<saltHex>:<hashHex>`
 * - salt: 16 bytes aleatorios (32 hex chars)
 * - hash: 64 bytes derivados (128 hex chars)
 *
 * No requiere instalar dependencias externas.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCHEME      = "scrypt";
const SALT_BYTES  = 16;
const KEY_LENGTH  = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

/**
 * Genera un hash del PIN.
 * Retorna string con formato "scrypt:<salt>:<hash>".
 */
export function hashPassword(plain: string): string {
  if (!plain || plain.length < 4) {
    throw new Error("PIN/contraseña debe tener al menos 4 caracteres");
  }
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(plain, salt, KEY_LENGTH, SCRYPT_OPTS);
  return `${SCHEME}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verifica un PIN contra un hash almacenado.
 * Usa comparación timing-safe.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;

  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== SCHEME) return false;

  try {
    const salt        = Buffer.from(parts[1], "hex");
    const expected    = Buffer.from(parts[2], "hex");
    const candidate   = scryptSync(plain, salt, expected.length, SCRYPT_OPTS);
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
