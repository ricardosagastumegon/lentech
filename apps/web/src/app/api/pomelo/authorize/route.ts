/**
 * POST /api/pomelo/authorize
 *
 * Este es el endpoint más crítico de la integración Pomelo.
 * Pomelo llama aquí EN TIEMPO REAL cuando el usuario paga con la tarjeta LEN.
 * LEN tiene < 5 segundos para responder APPROVED o REJECTED.
 *
 * Flujo:
 *   Usuario toca tarjeta LEN en terminal
 *   → Pomelo envía POST a este endpoint con los detalles de la transacción
 *   → LEN verifica firma HMAC del request
 *   → LEN busca el saldo MEXCOIN del usuario en Celo
 *   → Si saldo suficiente: responde APPROVED (Pomelo permite el pago)
 *   → Si saldo insuficiente: responde REJECTED (Pomelo declina el pago)
 *   → El MEXCOIN se quema en el webhook de confirmación (no aquí)
 *
 * Nota: Este endpoint solo AUTORIZA — no quema MEXCOIN todavía.
 * El quemado ocurre cuando Pomelo confirma el pago via /api/webhooks/pomelo/transactions.
 * Esto sigue el estándar de procesamiento de pagos con tarjeta (auth ≠ capture).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPomeloWebhook, signAuthResponse as _signAuthResponse } from "@/lib/pomelo-client";
import { getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PomeloTransactionRequest, PomeloTransactionResponse } from "@/types/pomelo";
import type { Address } from "viem";

// Pomelo espera que LEN responda con estos headers firmados
const AUTH_ENDPOINT = "/api/pomelo/authorize";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody  = await req.text();
  const timestamp = String(Math.floor(Date.now() / 1000));

  // ── 1. Verificar firma del request ─────────────────────────────────────────
  const webhookHeaders = {
    "x-api-key":   req.headers.get("x-api-key"),
    "x-signature": req.headers.get("x-signature"),
    "x-timestamp": req.headers.get("x-timestamp"),
    "x-endpoint":  req.headers.get("x-endpoint"),
  };

  if (!verifyPomeloWebhook(rawBody, webhookHeaders)) {
    return buildAuthResponse(timestamp, {
      status:  "REJECTED",
      message: "SYSTEM_ERROR",
    });
  }

  // ── 2. Parsear transacción ─────────────────────────────────────────────────
  let tx: PomeloTransactionRequest;
  try {
    tx = JSON.parse(rawBody) as PomeloTransactionRequest;
  } catch {
    return buildAuthResponse(timestamp, {
      status:  "REJECTED",
      message: "SYSTEM_ERROR",
    });
  }

  const { transaction, card, user, amount } = tx;

  // Solo procesamos compras y retiros en cajero; las devoluciones se aprueban siempre
  if (transaction.type === "REFUND" || transaction.type === "REVERSAL") {
    console.log(`[pomelo/auth] Devolución auto-aprobada | tx: ${transaction.id}`);
    return buildAuthResponse(timestamp, { status: "APPROVED", message: null });
  }

  // ── 3. Buscar wallet Celo del usuario ──────────────────────────────────────
  const db       = getAdminDb();
  const userSnap = await db.collection("len_users").doc(user.id).get();

  if (!userSnap.exists) {
    console.error(`[pomelo/auth] Usuario ${user.id} no encontrado`);
    return buildAuthResponse(timestamp, { status: "REJECTED", message: "INVALID_CARD" });
  }

  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    console.error(`[pomelo/auth] Usuario ${user.id} sin wallet Celo`);
    return buildAuthResponse(timestamp, { status: "REJECTED", message: "SYSTEM_ERROR" });
  }

  // ── 4. Verificar saldo MEXCOIN ─────────────────────────────────────────────
  // amount.local está en centavos MXN (ej. 10000 = $100.00 MXN)
  const amountMxn = amount.local / 100;
  const amountStr = amountMxn.toFixed(2);

  let balance: string;
  try {
    balance = await getMexcoinBalanceServer(celoAddress);
  } catch (err) {
    console.error(`[pomelo/auth] Error consultando saldo para ${user.id}:`, err);
    return buildAuthResponse(timestamp, { status: "REJECTED", message: "SYSTEM_ERROR" });
  }

  if (parseFloat(balance) < amountMxn) {
    console.log(
      `[pomelo/auth] Saldo insuficiente para ${user.id}: tiene ${balance}, necesita ${amountStr} | tx: ${transaction.id}`
    );
    return buildAuthResponse(timestamp, {
      status:  "REJECTED",
      message: "INSUFFICIENT_FUNDS",
    });
  }

  // ── 5. Aprobar ─────────────────────────────────────────────────────────────
  console.log(
    `[pomelo/auth] ✓ APROBADO ${amountStr} MXN para ${user.id} | saldo: ${balance} | tx: ${transaction.id}`
  );
  return buildAuthResponse(timestamp, { status: "APPROVED", message: null });
}

// ── Helper: construye la respuesta firmada ────────────────────────────────────
function buildAuthResponse(
  timestamp: string,
  body: PomeloTransactionResponse
): NextResponse {
  const bodyStr   = JSON.stringify(body);
  const signature = _signAuthResponse(timestamp, AUTH_ENDPOINT, bodyStr);

  return new NextResponse(bodyStr, {
    status: 200,
    headers: {
      "Content-Type":  "application/json",
      "x-signature":   signature,
      "x-timestamp":   timestamp,
      "x-endpoint":    AUTH_ENDPOINT,
    },
  });
}
