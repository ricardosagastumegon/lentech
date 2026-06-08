/**
 * POST /api/webhooks/cuenca/deposit
 * SPEI entra a la CLABE del usuario → mintea MEXCOIN 1:1.
 * C10: Admin SDK + anti-replay (timestamp). C11: idempotencia ATÓMICA (reserva antes de mintear).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cuenca-client";
import { mintMexcoin } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { reserveWebhookEvent, completeWebhookEvent, releaseWebhookEvent } from "@/lib/webhook-idempotency";
import type { CuencaWebhookEvent, CuencaDepositData, ApiResponse } from "@/types/cuenca";
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

  if (event.type !== "transaction.deposit.completed") {
    return NextResponse.json({ ok: true, data: { ignored: true } });
  }
  const deposit = event.data as CuencaDepositData;

  // Idempotencia atómica: reservar ANTES de mintear (evita doble mint concurrente).
  if ((await reserveWebhookEvent(event.id, { source: "cuenca", type: event.type })) === "duplicate") {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  const db = getAdminDb();
  const userSnap = await db.collection("len_users").doc(deposit.user_id).get();
  if (!userSnap.exists) {
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ ok: false, error: `Usuario ${deposit.user_id} no encontrado`, code: "USER_NOT_FOUND" }, { status: 404 });
  }
  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ ok: false, error: "Usuario no tiene wallet Celo configurada", code: "NO_CELO_WALLET" }, { status: 422 });
  }

  const amountStr = (deposit.amount / 100).toFixed(2);
  let txHash: string;
  try {
    txHash = await mintMexcoin(celoAddress, amountStr, `SPEI:${deposit.transaction_id}`);
  } catch (err) {
    await releaseWebhookEvent(event.id);
    console.error(`[cuenca/deposit] Error minteando para ${deposit.user_id}:`, err);
    return NextResponse.json({ ok: false, error: "Error al procesar el depósito", code: "MINT_FAILED" }, { status: 500 });
  }

  await Promise.all([
    completeWebhookEvent(event.id, { event_type: event.type, user_id: deposit.user_id, amount_mxn: amountStr, celo_address: celoAddress, tx_hash: txHash }),
    db.collection("len_transactions").doc(txHash).set({
      type: "deposit", user_id: deposit.user_id, amount_mxn: amountStr, amount_token: amountStr,
      token: "MEXCOIN", tx_hash: txHash, spei_ref: deposit.transaction_id,
      sender_name: deposit.sender_name, sender_clabe: deposit.sender_clabe, status: "completed", created_at: new Date(),
    }),
  ]);

  console.log(`[cuenca/deposit] ✓ ${amountStr} MEXCOIN minteado para ${deposit.user_id} | tx: ${txHash}`);
  return NextResponse.json({ ok: true, data: { user_id: deposit.user_id, amount_mxn: amountStr, mexcoin_minted: amountStr, celo_tx_hash: txHash } });
}
