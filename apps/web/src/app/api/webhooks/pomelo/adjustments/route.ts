/**
 * POST /api/webhooks/pomelo/adjustments
 * Ajustes de Mastercard — no pueden rechazarse, siempre son efectivos.
 * Respuesta debe estar firmada.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPomeloWebhook, signAuthResponse as _signAuthResponse } from "@/lib/pomelo-client";
import { mintMexcoin, burnMexcoin } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PomeloAdjustmentRequest } from "@/types/pomelo";
import type { Address } from "viem";

const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";
const ADJUST_ENDPOINT = "/api/webhooks/pomelo/adjustments";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody  = await req.text();
  const timestamp = String(Math.floor(Date.now() / 1000));

  if (!verifyPomeloWebhook(rawBody, {
    "x-api-key":   req.headers.get("x-api-key"),
    "x-signature": req.headers.get("x-signature"),
    "x-timestamp": req.headers.get("x-timestamp"),
    "x-endpoint":  req.headers.get("x-endpoint"),
  })) {
    return buildResponse(timestamp, 401, { ok: false, error: "Firma inválida", code: "INVALID_SIGNATURE" });
  }

  let adj: PomeloAdjustmentRequest;
  try {
    adj = JSON.parse(rawBody) as PomeloAdjustmentRequest;
  } catch {
    return buildResponse(timestamp, 400, { ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" });
  }

  const { transaction, user, amount } = adj;
  const db = getAdminDb();

  const eventRef = db.collection(PROCESSED_EVENTS_COLLECTION).doc(`adj-${transaction.id}`);
  if ((await eventRef.get()).exists) {
    return buildResponse(timestamp, 200, { ok: true, data: { already_processed: true } });
  }

  const userSnap = await db.collection("len_users").doc(user.id).get();
  if (!userSnap.exists) {
    console.error(`[pomelo/adj] Usuario ${user.id} no encontrado`);
    return buildResponse(timestamp, 200, { ok: true, data: { skipped: true, reason: "user_not_found" } });
  }

  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    return buildResponse(timestamp, 200, { ok: true, data: { skipped: true, reason: "no_celo_wallet" } });
  }

  const amountMxn = amount.local / 100;
  const amountStr = amountMxn.toFixed(2);
  let txHash: string | undefined;

  if (transaction.type === "REVERSAL" || transaction.type === "REFUND") {
    txHash = await mintMexcoin(celoAddress, amountStr, `ADJ-REVERSAL:${transaction.id}`);
    console.log(`[pomelo/adj] Reversal: ${amountStr} MEXCOIN re-minteado | tx: ${txHash}`);
  } else if (transaction.type === "PURCHASE" || transaction.type === "WITHDRAWAL") {
    try {
      txHash = await burnMexcoin(celoAddress, amountStr, `ADJ-DEBIT:${transaction.id}`);
      console.log(`[pomelo/adj] Débito: ${amountStr} MEXCOIN quemado | tx: ${txHash}`);
    } catch (err) {
      console.error(`[pomelo/adj] Sin saldo para débito forzado ${transaction.id}:`, err);
    }
  }

  await eventRef.set({ tx_id: transaction.id, user_id: user.id, type: transaction.type, amount_mxn: amountStr, tx_hash: txHash ?? null, processed_at: new Date() });
  return buildResponse(timestamp, 200, { ok: true, data: { processed: true, tx_hash: txHash ?? null } });
}

function buildResponse(timestamp: string, status: number, body: object): NextResponse {
  const bodyStr   = JSON.stringify(body);
  const signature = _signAuthResponse(timestamp, ADJUST_ENDPOINT, bodyStr);
  return new NextResponse(bodyStr, {
    status,
    headers: { "Content-Type": "application/json", "x-signature": signature, "x-timestamp": timestamp, "x-endpoint": ADJUST_ENDPOINT },
  });
}
