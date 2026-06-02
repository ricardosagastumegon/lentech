/**
 * POST /api/webhooks/pomelo/transactions
 *
 * Pomelo llama aquí después de resolver una transacción (aprobada o rechazada).
 * event_id "approved-authorization-advice" → quema MEXCOIN
 * event_id "authorization-advice"          → tx rechazada, solo log
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPomeloWebhook } from "@/lib/pomelo-client";
import { mintMexcoin, burnMexcoin, getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PomeloTransactionNotification, ApiResponse } from "@/types/pomelo";
import type { Address } from "viem";

const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const rawBody = await req.text();
  if (!verifyPomeloWebhook(rawBody, {
    "x-api-key":   req.headers.get("x-api-key"),
    "x-signature": req.headers.get("x-signature"),
    "x-timestamp": req.headers.get("x-timestamp"),
    "x-endpoint":  req.headers.get("x-endpoint"),
  })) {
    return NextResponse.json({ ok: false, error: "Firma inválida", code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let event: PomeloTransactionNotification;
  try {
    event = JSON.parse(rawBody) as PomeloTransactionNotification;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { event_id, idempotency_key, event_detail } = event;
  const db = getAdminDb();

  // ── Idempotencia ───────────────────────────────────────────────────────────
  const eventRef = db.collection(PROCESSED_EVENTS_COLLECTION).doc(idempotency_key);
  const existing = await eventRef.get();
  if (existing.exists) {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  // Tx rechazada — registrar y salir
  if (event_id === "authorization-advice") {
    await eventRef.set({ event_id, idempotency_key, tx_id: event_detail.transaction.id, user_id: event_detail.user.id, status: "rejected", processed_at: new Date() });
    console.log(`[pomelo/tx] Tx rechazada | tx: ${event_detail.transaction.id}`);
    return NextResponse.json({ ok: true, data: { recorded: true, status: "rejected" } });
  }

  if (event_id !== "approved-authorization-advice") {
    return NextResponse.json({ ok: true, data: { ignored: true } });
  }

  const { transaction, card, user, amount, merchant } = event_detail;

  // ── Buscar wallet Celo ─────────────────────────────────────────────────────
  const userSnap = await db.collection("len_users").doc(user.id).get();
  if (!userSnap.exists) {
    return NextResponse.json({ ok: false, error: `Usuario ${user.id} no encontrado`, code: "USER_NOT_FOUND" }, { status: 404 });
  }
  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    return NextResponse.json({ ok: false, error: "Usuario sin wallet Celo", code: "NO_CELO_WALLET" }, { status: 422 });
  }

  const amountMxn = amount.local / 100;
  const amountStr = amountMxn.toFixed(2);

  // ── Reversal: re-mintear ───────────────────────────────────────────────────
  if (transaction.type === "REVERSAL" || transaction.type === "REFUND") {
    const txHash = await mintMexcoin(celoAddress, amountStr, `REVERSAL:${transaction.id}`);
    await eventRef.set({ event_id, idempotency_key, tx_id: transaction.id, user_id: user.id, amount_mxn: amountStr, tx_hash: txHash, type: "reversal", processed_at: new Date() });
    console.log(`[pomelo/tx] Reversal: ${amountStr} MEXCOIN re-minteado | tx: ${txHash}`);
    return NextResponse.json({ ok: true, data: { reversed: true, tx_hash: txHash } });
  }

  // ── Compra aprobada: quemar MEXCOIN ────────────────────────────────────────
  const balance = await getMexcoinBalanceServer(celoAddress);
  if (parseFloat(balance) < amountMxn) {
    console.error(`[pomelo/tx] Saldo insuficiente en capture: ${user.id} tiene ${balance}, necesita ${amountStr}`);
    return NextResponse.json({ ok: false, error: "Saldo insuficiente", code: "INSUFFICIENT_BALANCE" }, { status: 422 });
  }

  let txHash: string;
  try {
    txHash = await burnMexcoin(celoAddress, amountStr, `CARD:${transaction.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[pomelo/tx] Error quemando MEXCOIN para ${user.id}:`, message);
    return NextResponse.json({ ok: false, error: `Error en blockchain: ${message}`, code: "BURN_FAILED" }, { status: 500 });
  }

  await Promise.all([
    eventRef.set({ event_id, idempotency_key, tx_id: transaction.id, user_id: user.id, amount_mxn: amountStr, merchant: merchant.name, card_id: card.id, tx_hash: txHash, type: "card_payment", processed_at: new Date() }),
    db.collection("len_transactions").doc(txHash).set({ type: "card_payment", user_id: user.id, amount_mxn: amountStr, amount_token: amountStr, token: "MEXCOIN", tx_hash: txHash, merchant: merchant.name, card_id: card.id, pomelo_tx_id: transaction.id, status: "completed", created_at: new Date() }),
  ]);

  console.log(`[pomelo/tx] ✓ ${amountStr} MEXCOIN quemado para ${user.id} | merchant: ${merchant.name} | tx: ${txHash}`);
  return NextResponse.json({ ok: true, data: { user_id: user.id, amount_mxn: amountStr, mexcoin_burned: amountStr, celo_tx_hash: txHash } });
}
