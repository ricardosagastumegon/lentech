/**
 * Cliente HTTP para Conduit API
 * Docs: https://docs.conduit.financial
 *
 * Variables de entorno requeridas:
 *   CONDUIT_API_KEY        — clave pública (header "X-API-Key" o Basic auth)
 *   CONDUIT_API_SECRET     — clave privada (Basic auth pair)
 *   CONDUIT_BASE_URL       — https://api.sandbox.conduit.financial (sandbox)
 *                            https://api.conduit.financial          (prod)
 *   CONDUIT_WEBHOOK_SECRET — secreto para verificar HMAC-SHA256 de webhooks
 *
 * Conduit a diferencia de Pomelo NO usa OAuth — usa API key directo en header.
 * El secret va con la key como Basic auth (key:secret en base64).
 */

import { createHmac, timingSafeEqual } from "crypto";
import type {
  ConduitAccount,
  ConduitPayout,
  ConduitPayoutRequest,
  ConduitQuote,
} from "@/types/conduit";

const BASE_URL       = process.env.CONDUIT_BASE_URL       ?? "https://api.sandbox.conduit.financial";
const API_KEY        = process.env.CONDUIT_API_KEY        ?? "";
const API_SECRET     = process.env.CONDUIT_API_SECRET     ?? "";
const WEBHOOK_SECRET = process.env.CONDUIT_WEBHOOK_SECRET ?? "";

// ── HTTP helper ───────────────────────────────────────────────────────────────

/**
 * Conduit usa dos headers separados para auth (NO Basic auth):
 *   X-API-Key:    YOUR_API_KEY
 *   X-API-Secret: YOUR_API_SECRET
 *
 * Los paths NO llevan prefix /v1 — son directos: /accounts, /payouts, etc.
 */
async function conduitRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path:   string,
  body?:  Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "X-API-Key":    API_KEY,
      "X-API-Secret": API_SECRET,
      "Content-Type":  "application/json",
      "Accept":        "application/json",
      "X-LEN-Client":  "1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conduit API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Account ──────────────────────────────────────────────────────────────────

/** Lista todas las cuentas de LEN en Conduit */
export async function listConduitAccounts(): Promise<{ data: ConduitAccount[] }> {
  return conduitRequest<{ data: ConduitAccount[] }>("GET", "/accounts");
}

/** Obtiene los balances de una cuenta específica de LEN en Conduit */
export async function getConduitAccount(accountId: string): Promise<ConduitAccount> {
  return conduitRequest<ConduitAccount>("GET", `/accounts/${accountId}`);
}

// ── Quotes ───────────────────────────────────────────────────────────────────

/** Cotiza una conversión antes de ejecutarla */
export async function getQuote(params: {
  source_asset:        string;
  destination_asset:   string;
  source_amount?:      string;
  destination_amount?: string;
}): Promise<ConduitQuote> {
  return conduitRequest<ConduitQuote>("POST", "/quotes", params);
}

// ── Payout (off-ramp LATAM) ──────────────────────────────────────────────────

/**
 * Inicia un payout: convierte stablecoin a fiat local y lo envía al beneficiario.
 * Para MX usa SPEI (rail por confirmar con Conduit), para BR usa PIX, etc.
 */
export async function createPayout(req: ConduitPayoutRequest): Promise<ConduitPayout> {
  return conduitRequest<ConduitPayout>("POST", "/payouts", req as unknown as Record<string, unknown>);
}

/** Consulta el estado de un payout existente */
export async function getPayout(payoutId: string): Promise<ConduitPayout> {
  return conduitRequest<ConduitPayout>("GET", `/payouts/${payoutId}`);
}

// ── Webhook verification ─────────────────────────────────────────────────────

/**
 * Verifica firma HMAC-SHA256 de un webhook entrante de Conduit.
 *
 * Formato confirmado por docs (docs.conduit.financial/guides/webhooks/first-webhook):
 *   • Header "conduit-signature"           — firma HMAC-SHA256 hex
 *   • Header "conduit-signature-timestamp" — Unix timestamp del firmado
 *   • Mensaje firmado: `${timestamp}.${rawBody}`
 *   • Algoritmo: HMAC-SHA256
 *   • Encoding: hex
 *
 * Defensa contra replay: rechaza requests > 5 minutos viejos.
 *
 * IMPORTANTE: pasar el body raw (sin parsear), tal cual llegó en el request.
 */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60; // 5 minutos

export function verifyConduitWebhook(
  rawBody:  string,
  headers: {
    signature?: string | null;
    timestamp?: string | null;
  },
): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[conduit] CONDUIT_WEBHOOK_SECRET no configurado");
    return false;
  }
  const { signature, timestamp } = headers;
  if (!signature || !timestamp) {
    return false;
  }

  // ── Replay protection: rechazar requests viejos ──────────────────────────
  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - tsNum);
  if (ageSeconds > MAX_WEBHOOK_AGE_SECONDS) {
    console.error(`[conduit] webhook timestamp expirado: ${ageSeconds}s de antigüedad`);
    return false;
  }

  // ── Calcular firma esperada ──────────────────────────────────────────────
  const message     = `${timestamp}.${rawBody}`;
  const expectedHex = createHmac("sha256", WEBHOOK_SECRET)
    .update(message, "utf8")
    .digest("hex");

  // ── Comparación timing-safe ──────────────────────────────────────────────
  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expectedHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
