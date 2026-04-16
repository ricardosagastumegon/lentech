/**
 * POST /api/webhooks/cuenca/card-payment
 *
 * Cuenca llama a este endpoint cuando el usuario usa su tarjeta digital LEN.
 * LEN quema MEXCOIN equivalente al monto del pago.
 *
 * Flujo:
 *   Usuario paga en tienda con tarjeta LEN Mastercard
 *   → Cuenca procesa el pago
 *   → Cuenca dispara este webhook
 *   → LEN quema MEXCOIN del usuario en Celo
 *
 * Nota: En producción, Cuenca puede hacer una "pre-autorización" antes del
 * pago real. Aquí procesamos solo "card.payment.completed".
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cuenca-client";
import { mintMexcoin, burnMexcoin, getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { CuencaWebhookEvent, CuencaCardPaymentData, ApiResponse } from "@/types/cuenca";
import type { Address } from "viem";

const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Verificar firma ─────────────────────────────────────────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("x-cuenca-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "Firma de webhook inválida", code: "INVALID_SIGNATURE" },
      { status: 401 }
    );
  }

  // ── 2. Parsear evento ──────────────────────────────────────────────────────
  let event: CuencaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as CuencaWebhookEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const db = getDb();

  // ── 3. Manejar reversión de pago ───────────────────────────────────────────
  if (event.type === "card.payment.reversed") {
    const payment = event.data as CuencaCardPaymentData;
    // Re-mintear los MEXCOIN al usuario
    const userRef = doc(db, "len_users", payment.user_id);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const celoAddress = userSnap.data()?.celo_address as Address;
      const amountStr = (payment.amount / 100).toFixed(2);
      const txHash = await mintMexcoin(
        celoAddress,
        amountStr,
        `REVERSAL:${payment.payment_id}`
      );
      console.log(`[card] Reversión procesada: ${amountStr} MEXCOIN re-minteado | tx: ${txHash}`);
    }
    return NextResponse.json({ ok: true, data: { reversed: true } });
  }

  if (event.type !== "card.payment.completed") {
    return NextResponse.json({ ok: true, data: { ignored: true } });
  }

  const payment = event.data as CuencaCardPaymentData;

  // ── 4. Idempotencia ────────────────────────────────────────────────────────
  const eventRef = doc(db, PROCESSED_EVENTS_COLLECTION, event.id);
  const existing = await getDoc(eventRef);
  if (existing.exists()) {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  // ── 5. Buscar wallet Celo del usuario ──────────────────────────────────────
  const userRef = doc(db, "len_users", payment.user_id);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return NextResponse.json(
      { ok: false, error: `Usuario ${payment.user_id} no encontrado`, code: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    return NextResponse.json(
      { ok: false, error: "Usuario no tiene wallet Celo configurada", code: "NO_CELO_WALLET" },
      { status: 422 }
    );
  }

  const amountStr = (payment.amount / 100).toFixed(2);

  // ── 6. Verificar saldo suficiente ──────────────────────────────────────────
  const currentBalance = await getMexcoinBalanceServer(celoAddress);
  if (parseFloat(currentBalance) < parseFloat(amountStr)) {
    console.error(
      `[card] Saldo insuficiente para ${payment.user_id}: tiene ${currentBalance}, necesita ${amountStr}`
    );
    return NextResponse.json(
      { ok: false, error: "Saldo MEXCOIN insuficiente", code: "INSUFFICIENT_BALANCE" },
      { status: 422 }
    );
  }

  // ── 7. Quemar MEXCOIN ──────────────────────────────────────────────────────
  let txHash: string;
  try {
    txHash = await burnMexcoin(
      celoAddress,
      amountStr,
      `CARD:${payment.payment_id}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[card] Error quemando MEXCOIN para ${payment.user_id}:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}`, code: "BURN_FAILED" },
      { status: 500 }
    );
  }

  // ── 8. Registrar como procesado ────────────────────────────────────────────
  await setDoc(eventRef, {
    event_id:      event.id,
    event_type:    event.type,
    user_id:       payment.user_id,
    amount_cents:  payment.amount,
    amount_mxn:    amountStr,
    celo_address:  celoAddress,
    merchant:      payment.merchant_name,
    tx_hash:       txHash,
    processed_at:  serverTimestamp(),
  });

  const txDocRef = doc(db, "len_transactions", txHash);
  await setDoc(txDocRef, {
    type:         "card_payment",
    user_id:      payment.user_id,
    amount_mxn:   amountStr,
    amount_token: amountStr,
    token:        "MEXCOIN",
    tx_hash:      txHash,
    merchant:     payment.merchant_name,
    card_id:      payment.card_id,
    status:       "completed",
    created_at:   serverTimestamp(),
  });

  console.log(`[card] ✓ ${amountStr} MEXCOIN quemado para ${payment.user_id} | merchant: ${payment.merchant_name} | tx: ${txHash}`);

  return NextResponse.json({
    ok: true,
    data: {
      user_id:       payment.user_id,
      amount_mxn:    amountStr,
      mexcoin_burned: amountStr,
      celo_tx_hash:  txHash,
      merchant:      payment.merchant_name,
    },
  });
}
