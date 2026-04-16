/**
 * Cliente HTTP para Cuenca API
 * Documentación: https://docs.cuenca.com
 *
 * Variables de entorno requeridas:
 *   CUENCA_API_KEY       — API key de producción o sandbox
 *   CUENCA_API_URL       — https://api.cuenca.com (prod) o https://sandbox.cuenca.com (sandbox)
 *   CUENCA_WEBHOOK_SECRET — Secreto para verificar firmas de webhooks (HMAC-SHA256)
 */

import { createHmac } from "crypto";

const BASE_URL = process.env.CUENCA_API_URL ?? "https://sandbox.cuenca.com";
const API_KEY  = process.env.CUENCA_API_KEY ?? "";

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function cuencaRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type":  "application/json",
      "X-LEN-Client":  "1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cuenca API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Verificación de webhooks ──────────────────────────────────────────────────

/**
 * Verifica que el webhook viene realmente de Cuenca.
 * Cuenca firma el payload con HMAC-SHA256 y lo envía en el header
 * X-Cuenca-Signature: sha256=<hex>
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.CUENCA_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const [algo, receivedSig] = signatureHeader.split("=");
  if (algo !== "sha256" || !receivedSig) return false;

  const expectedSig = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Comparación de tiempo constante para evitar timing attacks
  return timingSafeEqual(expectedSig, receivedSig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Operaciones de wallet ─────────────────────────────────────────────────────

export interface CuencaUser {
  id:     string;
  name:   string;
  email:  string;
  clabe:  string;         // CLABE asignada al usuario
  status: "active" | "blocked" | "pending_kyc";
}

export interface CuencaWithdrawalResult {
  withdrawal_id:  string;
  status:         "pending" | "completed" | "failed";
  estimated_time: string;  // ISO 8601
}

/**
 * Obtiene datos del usuario en Cuenca.
 */
export async function getCuencaUser(userId: string): Promise<CuencaUser> {
  return cuencaRequest<CuencaUser>("GET", `/v1/users/${userId}`);
}

/**
 * Ordena una transferencia SPEI saliente (cuando el usuario retira MXN).
 * amount_mxn: número en centavos, ej. 10000 = $100.00 MXN
 */
export async function sendWithdrawal(params: {
  user_id:           string;
  amount_cents:      number;
  destination_clabe: string;
  reference:         string;
}): Promise<CuencaWithdrawalResult> {
  return cuencaRequest<CuencaWithdrawalResult>("POST", "/v1/withdrawals", {
    user_id:           params.user_id,
    amount:            params.amount_cents,
    currency:          "MXN",
    destination_clabe: params.destination_clabe,
    reference:         params.reference,
  });
}

/**
 * Bloquea fondos antes de procesar un retiro (previene double-spend).
 */
export async function holdFunds(params: {
  user_id:      string;
  amount_cents: number;
  reference:    string;
}): Promise<{ hold_id: string }> {
  return cuencaRequest<{ hold_id: string }>("POST", "/v1/holds", params);
}

/**
 * Libera un hold (si el retiro falló en Celo).
 */
export async function releaseHold(holdId: string): Promise<void> {
  await cuencaRequest("POST", `/v1/holds/${holdId}/release`, {});
}
