/**
 * POST /api/webhooks/pomelo/deposit
 * Mintea MEXCOIN 1:1 cuando llega un depósito/carga en la cuenta Pomelo del usuario.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPomeloWebhook } from "@/lib/pomelo-client";
import { mintMexcoin } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApiResponse } from "@/types/pomelo";
import type { Address } from "viem";

const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";

interface PomeloDepositEvent {
  id:         string;
  event_type: "ACCOUNT_DEPOSIT" | "BALANCE_TOP_UP" | "SPEI_RECEIVED";
  created_at: string;
  data: {
    account_id:     string;
    user_id:        string;
    amount:         number;
    currency:       "MXN";
    reference:      string;
    sender_name?:   string;
    sender_clabe?:  string;
    transaction_id: string;
  };
}

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

  let event: PomeloDepositEvent;
  try {
    event = JSON.parse(rawBody) as PomeloDepositEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const db      = getAdminDb();
  const eventRef = db.collection(PROCESSED_EVENTS_COLLECTION).doc(event.id);
  if ((await eventRef.get()).exists) {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  const { data } = event;
  const userSnap = await db.collection("len_users").doc(data.user_id).get();
  if (!userSnap.exists) {
    return NextResponse.json({ ok: false, error: `Usuario ${data.user_id} no encontrado`, code: "USER_NOT_FOUND" }, { status: 404 });
  }

  const celoAddress = userSnap.data()?.celo_address as Address | undefined;
  if (!celoAddress) {
    return NextResponse.json({ ok: false, error: "Usuario sin wallet Celo", code: "NO_CELO_WALLET" }, { status: 422 });
  }

  const amountStr = (data.amount / 100).toFixed(2);

  let txHash: string;
  try {
    txHash = await mintMexcoin(celoAddress, amountStr, `DEPOSIT:${data.transaction_id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[pomelo/deposit] Error minteando para ${data.user_id}:`, message);
    return NextResponse.json({ ok: false, error: `Error en blockchain: ${message}`, code: "MINT_FAILED" }, { status: 500 });
  }

  await Promise.all([
    eventRef.set({ event_id: event.id, event_type: event.event_type, user_id: data.user_id, amount_mxn: amountStr, tx_hash: txHash, processed_at: new Date() }),
    db.collection("len_transactions").doc(txHash).set({ type: "deposit", user_id: data.user_id, amount_mxn: amountStr, amount_token: amountStr, token: "MEXCOIN", tx_hash: txHash, reference: data.reference, sender_name: data.sender_name ?? null, sender_clabe: data.sender_clabe ?? null, status: "completed", created_at: new Date() }),
  ]);

  console.log(`[pomelo/deposit] ✓ ${amountStr} MEXCOIN minteado para ${data.user_id} | tx: ${txHash}`);
  return NextResponse.json({ ok: true, data: { user_id: data.user_id, amount_mxn: amountStr, mexcoin_minted: amountStr, celo_tx_hash: txHash } });
}
