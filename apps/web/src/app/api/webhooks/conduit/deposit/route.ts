/**
 * POST /api/webhooks/conduit/deposit
 * On-ramp USA → LATAM. En transaction.completed mintea el token local.
 * C11: idempotencia ATÓMICA (reserva antes de mintear; libera en fallos para permitir reintento).
 *
 * Verificación: header "conduit-signature" + "conduit-signature-timestamp".
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyConduitWebhook } from "@/lib/conduit-client";
import { mintMexcoin } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { reserveWebhookEvent, completeWebhookEvent, releaseWebhookEvent } from "@/lib/webhook-idempotency";
import type { ApiResponse, ConduitWebhookEvent, ConduitPayin } from "@/types/conduit";
import type { Address } from "viem";

// Tipo de cambio del momento del minteo. En producción debe venir de getQuote() / oracle.
const USD_TO_MXN = 18.7;
const USD_TO_GTQ = 7.8;
const USD_TO_HNL = 24.8;

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const rawBody = await req.text();
  if (!verifyConduitWebhook(rawBody, {
    signature: req.headers.get("conduit-signature"),
    timestamp: req.headers.get("conduit-signature-timestamp"),
  })) {
    return NextResponse.json({ ok: false, error: "Firma inválida", code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let event: ConduitWebhookEvent<ConduitPayin>;
  try {
    event = JSON.parse(rawBody) as ConduitWebhookEvent<ConduitPayin>;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const db    = getAdminDb();
  const docId = `conduit-${event.event_sequence}`;

  // Idempotencia atómica.
  if ((await reserveWebhookEvent(docId, { source: "conduit", event: event.event })) === "duplicate") {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  // Solo transaction.completed mintea; el resto se acknowledga.
  if (event.event !== "transaction.completed") {
    await completeWebhookEvent(docId, { event: event.event, event_sequence: event.event_sequence, conduit_id: event.data?.id ?? null, acknowledged_only: true });
    return NextResponse.json({ ok: true, data: { acknowledged: event.event } });
  }

  const { data } = event;
  const userQuery = await db.collection("len_users").where("conduit_customer_id", "==", data.customer_id).limit(1).get();
  if (userQuery.empty) {
    await releaseWebhookEvent(docId);
    return NextResponse.json({ ok: false, error: "Usuario no encontrado", code: "USER_NOT_FOUND" }, { status: 404 });
  }

  const userDoc     = userQuery.docs[0];
  const userId      = userDoc.id;
  const userData    = userDoc.data();
  const celoAddress = userData.celo_address as Address | undefined;
  const country     = userData.country as "MX" | "GT" | "HN" | undefined;

  if (!celoAddress) {
    await releaseWebhookEvent(docId);
    return NextResponse.json({ ok: false, error: "Usuario sin wallet Celo", code: "NO_CELO_WALLET" }, { status: 422 });
  }

  const usdAmount = parseFloat(data.destination_amount);
  let localAmount: string;
  let token: "MEXCOIN" | "QUETZA" | "LEMPI";
  let mintFn: ((to: Address, amount: string, ref: string) => Promise<string>) | null = null;

  switch (country) {
    case "MX":
      localAmount = (usdAmount * USD_TO_MXN).toFixed(2); token = "MEXCOIN"; mintFn = mintMexcoin; break;
    case "GT":
      await releaseWebhookEvent(docId);
      return NextResponse.json({ ok: false, error: "QUETZA mint pendiente de implementar", code: "NOT_IMPLEMENTED" }, { status: 501 });
    case "HN":
      await releaseWebhookEvent(docId);
      return NextResponse.json({ ok: false, error: "LEMPI mint pendiente de implementar", code: "NOT_IMPLEMENTED" }, { status: 501 });
    default:
      await releaseWebhookEvent(docId);
      return NextResponse.json({ ok: false, error: `País no soportado: ${country}`, code: "COUNTRY_UNSUPPORTED" }, { status: 422 });
  }

  let txHash: string;
  try {
    txHash = await mintFn(celoAddress, localAmount, `CONDUIT:${data.id}`);
  } catch (err) {
    await releaseWebhookEvent(docId);
    console.error(`[conduit/deposit] Error minteando ${token} para ${userId}:`, err);
    return NextResponse.json({ ok: false, error: "Error al procesar el depósito", code: "MINT_FAILED" }, { status: 500 });
  }

  await Promise.all([
    completeWebhookEvent(docId, { event: event.event, event_sequence: event.event_sequence, conduit_id: data.id, user_id: userId, usd_amount: usdAmount.toFixed(2), local_amount: localAmount, token, tx_hash: txHash }),
    db.collection("len_transactions").doc(txHash).set({ type: "deposit_usa", source: "conduit", user_id: userId, method: data.method, usd_amount: usdAmount.toFixed(2), local_amount: localAmount, token, celo_tx_hash: txHash, conduit_payin_id: data.id, reference: data.reference, sender_name: data.sender_name ?? null, status: "completed", created_at: new Date() }),
  ]);

  console.log(`[conduit/deposit] ✓ $${usdAmount} USD → ${localAmount} ${token} para ${userId} | tx: ${txHash}`);
  return NextResponse.json({ ok: true, data: { user_id: userId, usd_amount: usdAmount.toFixed(2), local_amount: localAmount, token, celo_tx_hash: txHash, conduit_payin_id: data.id } });
}
