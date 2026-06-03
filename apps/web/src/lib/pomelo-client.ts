/**
 * Cliente HTTP para Pomelo API
 * Documentación: https://developers.pomelo.la
 *
 * Variables de entorno requeridas:
 *   POMELO_CLIENT_ID       — Client ID del portal de desarrolladores
 *   POMELO_CLIENT_SECRET   — Client Secret del portal de desarrolladores
 *   POMELO_AUDIENCE        — https://auth.pomelo.la (prod) | https://auth-dev.pomelo.la (sandbox)
 *   POMELO_API_URL         — https://api.pomelo.la (prod)  | https://api-dev.pomelo.la (sandbox)
 *   POMELO_WEBHOOK_SECRET  — Secreto para verificar firmas HMAC-SHA256 de webhooks
 *   POMELO_WEBHOOK_API_KEY — Valor esperado en header x-api-key de webhooks entrantes
 */

import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // rechaza webhooks con >5 min de antigüedad
import type { PomeloTokenResponse, PomeloTransactionResponse } from "@/types/pomelo";

const BASE_URL  = process.env.POMELO_API_URL      ?? "https://api-dev.pomelo.la";
const AUDIENCE  = process.env.POMELO_AUDIENCE     ?? "https://auth-dev.pomelo.la";
const CLIENT_ID = process.env.POMELO_CLIENT_ID    ?? "";
const CLIENT_SECRET = process.env.POMELO_CLIENT_SECRET ?? "";

// ── Token cache (en memoria, válido durante el proceso) ───────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  // Renovar con 60 segundos de margen
  if (_cachedToken && now < _tokenExpiresAt - 60) {
    return _cachedToken;
  }

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience:      AUDIENCE,
      grant_type:    "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pomelo OAuth error ${res.status}: ${text}`);
  }

  const data = await res.json() as PomeloTokenResponse;
  _cachedToken    = data.access_token;
  _tokenExpiresAt = now + data.expires_in;
  return _cachedToken;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function pomeloRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "X-LEN-Client":  "1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pomelo API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Verificación de webhooks entrantes ────────────────────────────────────────
//
// Pomelo firma cada webhook con HMAC-SHA256.
// String firmado: timestamp + endpoint + rawBody
// Header x-signature contiene el hex resultante.
// Header x-api-key identifica el par de credenciales.

export function verifyPomeloWebhook(
  rawBody:   string,
  headers: {
    "x-api-key"?:   string | null;
    "x-signature"?: string | null;
    "x-timestamp"?: string | null;
    "x-endpoint"?:  string | null;
  }
): boolean {
  const secret = process.env.POMELO_WEBHOOK_SECRET;
  const apiKey = process.env.POMELO_WEBHOOK_API_KEY;

  const { "x-api-key": xApiKey, "x-signature": xSignature, "x-timestamp": xTimestamp, "x-endpoint": xEndpoint } = headers;

  if (!secret || !apiKey || !xApiKey || !xSignature || !xTimestamp || !xEndpoint) {
    return false;
  }

  // Anti-replay: el timestamp del webhook debe ser reciente (≤5 min).
  const tsMs = /^\d+$/.test(xTimestamp)
    ? (xTimestamp.length >= 13 ? Number(xTimestamp) : Number(xTimestamp) * 1000)
    : new Date(xTimestamp).getTime();
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) return false;

  if (!timingSafeEqual(xApiKey, apiKey)) return false;

  // Pomelo firma: HMAC-SHA256(secret, timestamp + endpoint + body)
  // Formato del header: "hmac-sha256 <base64>"
  const message = xTimestamp + xEndpoint + rawBody;
  const expectedBase64 = createHmac("sha256", secret)
    .update(message, "utf8")
    .digest("base64");
  const expectedHeader = `hmac-sha256 ${expectedBase64}`;

  return timingSafeEqual(expectedHeader, xSignature);
}

function timingSafeEqual(a: string, b: string): boolean {
  // Compara digests de longitud fija con la primitiva nativa: timing-safe real
  // y sin filtrar la longitud de los valores comparados.
  const ha = createHmac("sha256", "len-cmp").update(a).digest();
  const hb = createHmac("sha256", "len-cmp").update(b).digest();
  return cryptoTimingSafeEqual(ha, hb);
}

// ── Firma de respuesta de autorización ────────────────────────────────────────
//
// Cuando LEN responde a una autorización, también debe firmar la respuesta
// para que Pomelo verifique que la respuesta viene de LEN.

export function signAuthResponse(
  timestamp:    string,
  endpoint:     string,
  responseBody: string
): string {
  const secret = process.env.POMELO_WEBHOOK_SECRET ?? "";
  const base64 = createHmac("sha256", secret)
    .update(timestamp + endpoint + responseBody, "utf8")
    .digest("base64");
  return `hmac-sha256 ${base64}`;
}

// ── API: Usuarios ─────────────────────────────────────────────────────────────

export interface PomeloUser {
  id:     string;
  name:   string;
  email:  string;
  status: "ACTIVE" | "BLOCKED" | "PENDING_KYC";
}

export async function getPomeloUser(userId: string): Promise<PomeloUser> {
  return pomeloRequest<PomeloUser>("GET", `/v1/users/${userId}`);
}

// ── API: Tarjetas ─────────────────────────────────────────────────────────────

export interface PomeloCard {
  id:           string;
  user_id:      string;
  status:       "ACTIVE" | "BLOCKED" | "CANCELLED";
  product_type: "PREPAID";
  last_four:    string;
}

export async function getCard(cardId: string): Promise<PomeloCard> {
  return pomeloRequest<PomeloCard>("GET", `/v1/cards/${cardId}`);
}

export async function blockCard(cardId: string, reason: string): Promise<void> {
  await pomeloRequest("PATCH", `/v1/cards/${cardId}/block`, { reason });
}

// ── API: Cuentas digitales ────────────────────────────────────────────────────

export interface PomeloAccountResult {
  id:       string;
  user_id:  string;
  country:  string;
  currency: string;
  status:   string;
}

export async function createDigitalAccount(params: {
  user_id:      string;
  country:      "MEX";
  currency:     "MXN";
  idempotencyKey: string;
}): Promise<PomeloAccountResult> {
  return pomeloRequest<PomeloAccountResult>("POST", "/core/accounts/v1", {
    owner_type: "USER",
    user_id:    params.user_id,
    country:    params.country,
    currency:   params.currency,
  });
}

// ── API: Movimientos digitales ────────────────────────────────────────────────
// Usado por LEN para registrar movimientos en las cuentas digitales de Pomelo.
// Incluye SPEI saliente (BANK_TRANSFER_OUT) cuando el usuario retira MXN.

export type PomeloMovementType =
  | "BANK_TRANSFER_IN"   // SPEI entrante (depósito)
  | "BANK_TRANSFER_OUT"  // SPEI saliente (retiro)
  | "CARD_PURCHASE"      // Compra con tarjeta
  | "CASHIN"             // Carga de saldo
  | "CASHOUT";           // Retiro de saldo

export interface PomeloMovementResult {
  id:     string;
  status: "APPROVED" | "REJECTED";
  result: Record<string, unknown>;
}

export async function createMovement(params: {
  account_id:     string;
  type:           PomeloMovementType;
  process_type:   "ORIGINAL" | "ADJUSTMENT" | "REFUND" | "REVERSAL";
  entry_type:     "CREDIT" | "DEBIT";
  total_amount:   string;  // ej. "100.00"
  data:           Record<string, unknown>;
  idempotencyKey: string;
}): Promise<PomeloMovementResult> {
  return pomeloRequest<PomeloMovementResult>("POST", "/core/transactions/v1", {
    account_id:   params.account_id,
    type:         params.type,
    process_type: params.process_type,
    entry_type:   params.entry_type,
    total_amount: params.total_amount,
    data:         params.data,
  });
}
