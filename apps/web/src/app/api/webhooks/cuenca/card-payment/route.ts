/**
 * POST /api/webhooks/cuenca/card-payment
 * Pago con tarjeta LEN → quema MEXCOIN. Reversión → re-mintea.
 * C10: Admin SDK + anti-replay. C11: idempotencia ATÓMICA.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cuenca-client";
import { mintMexcoin, burnMexcoin, getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { reserveWebhookEvent, completeWebhookEvent, releaseWebhookEvent } from "@/lib/webhook-idempotency";
import type { CuencaWebhookEvent, CuencaCardPaymentData, ApiResponse } from "@/types/cuenca";
import type { Address } from "viem";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const rawBody   = await req.text();
  const signature = req.headers.get("x-cuenca-signature");
  const timestamp = req.headers.get("x-cuenca-timestamp");

  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ ok: false, error: "Firma de webhook inválida", code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let event: CuencaWebhookEvent;
  try { event = JSON.parse(rawBody) as CuencaWebhookEvent; }
  catch { return NextResponse.json({ ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" }, { status: 400 }); }

  const db = getAdminDb();

  // ── Reversión de pago → re-mintear (idempotente) ──────────────────────────
  if (event.type === "card.payment.reversed") {
    const payment = event.data as CuencaCardPaymentData;
    if ((await reserveWebhookEvent(event.id, { source: "cuenca", type: event.type })) === "duplicate") {
      return NextResponse.json({ ok: true, data: { already_processed: true } });
    }
    const userSnap = await db.collection("len_users").doc(payment.user_id).get();
    const celoAddress = userSnap.exists ? (userSnap.data()?.celo_address as Address | undefined) : undefined;
    if (!celoAddress) { await releaseWebhookEvent(event.id); return NextResponse.json({ ok: true, data: { reversed: false } }); }
    const amountStr = (payment.amount / 100).toFixed(2);
    try {
      const txHash = await mintMexcoin(celoAddress, amountStr, `REVERSAL:${payment.payment_id}`);
      await completeWebhookEvent(event.id, { event_type: event.type, user_id: payment.user_id, amount_mxn: amountStr, tx_hash: txHash });
      console.log(`[card] Reversión: ${amountStr} MEXCOIN re-minteado | tx: ${txHash}`);
    } catch (err) {
      await releaseWebhookEvent(event.id);
      console.error("[card] error reversión:", err);
      return NextResponse.json({ ok: false, error: "Error al procesar la reversión", code: "MINT_FAILED" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: { reversed: true } });
  }

  if (event.type !== "card.payment.completed") {
    return NextResponse.json({ ok: true, data: { ignored: true } });
  }
  const payment = event.data as CuencaCardPaymentData;

  if ((await reserveWebhookEvent(event.id, { source: "cuenca", type: event.type })) === "duplicate") {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  const userSnap = await db.collection("len_users").doc(payment.user_id).get();
  if (!userSnap.exists) {
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ ok: false, error: `Usuario ${payment.user_id} no encontrado`, code: "USER_NOT_FOUND" }, { status: 404 });
  }
  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ ok: false, error: "Usuario no tiene wallet Celo configurada", code: "NO_CELO_WALLET" }, { status: 422 });
  }

  const amountStr = (payment.amount / 100).toFixed(2);
  const currentBalance = await getMexcoinBalanceServer(celoAddress);
  if (parseFloat(currentBalance) < parseFloat(amountStr)) {
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ ok: false, error: "Saldo MEXCOIN insuficiente", code: "INSUFFICIENT_BALANCE" }, { status: 422 });
  }

  let txHash: string;
  try {
    txHash = await burnMexcoin(celoAddress, amountStr, `CARD:${payment.payment_id}`);
  } catch (err) {
    await releaseWebhookEvent(event.id);
    console.error(`[card] error burn para ${payment.user_id}:`, err);
    return NextResponse.json({ ok: false, error: "Error al procesar el pago", code: "BURN_FAILED" }, { status: 500 });
  }

  await Promise.all([
    completeWebhookEvent(event.id, { event_type: event.type, user_id: payment.user_id, amount_mxn: amountStr, merchant: payment.merchant_name, tx_hash: txHash }),
    db.collection("len_transactions").doc(txHash).set({
      type: "card_payment", user_id: payment.user_id, amount_mxn: amountStr, amount_token: amountStr,
      token: "MEXCOIN", tx_hash: txHash, merchant: payment.merchant_name, card_id: payment.card_id,
      status: "completed", created_at: new Date(),
    }),
  ]);

  console.log(`[card] ✓ ${amountStr} MEXCOIN quemado para ${payment.user_id} | tx: ${txHash}`);
  return NextResponse.json({ ok: true, data: { user_id: payment.user_id, amount_mxn: amountStr, mexcoin_burned: amountStr, celo_tx_hash: txHash, merchant: payment.merchant_name } });
}
