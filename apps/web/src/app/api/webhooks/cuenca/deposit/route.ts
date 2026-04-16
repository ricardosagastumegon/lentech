/**
 * POST /api/webhooks/cuenca/deposit
 *
 * Cuenca llama a este endpoint cuando un usuario recibe un SPEI.
 * LEN responde minteando MEXCOIN 1:1 en la wallet Celo del usuario.
 *
 * Flujo:
 *   SPEI entra a CLABE del usuario en Cuenca
 *   → Cuenca dispara este webhook
 *   → Verificamos firma HMAC
 *   → Buscamos la wallet Celo del usuario en Firestore
 *   → Minteamos MEXCOIN 1:1 (centavos → unidades con 2 decimales)
 *   → Registramos la transacción
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cuenca-client";
import { mintMexcoin } from "@/lib/celo-admin";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { CuencaWebhookEvent, CuencaDepositData, ApiResponse } from "@/types/cuenca";
import type { Address } from "viem";

// IDs de eventos ya procesados (en producción usar Redis o Firestore)
// Aquí usamos Firestore para idempotencia
const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Leer body raw para verificar firma ──────────────────────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("x-cuenca-signature");

  // ── 2. Verificar firma HMAC-SHA256 ─────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "Firma de webhook inválida", code: "INVALID_SIGNATURE" },
      { status: 401 }
    );
  }

  // ── 3. Parsear evento ──────────────────────────────────────────────────────
  let event: CuencaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as CuencaWebhookEvent;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  // Solo procesamos depósitos completados
  if (event.type !== "transaction.deposit.completed") {
    return NextResponse.json({ ok: true, data: { ignored: true } });
  }

  const deposit = event.data as CuencaDepositData;

  // ── 4. Idempotencia — verificar si ya procesamos este evento ───────────────
  const db = getDb();
  const eventRef = doc(db, PROCESSED_EVENTS_COLLECTION, event.id);
  const existing = await getDoc(eventRef);

  if (existing.exists()) {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  // ── 5. Buscar wallet Celo del usuario en Firestore ─────────────────────────
  const userRef = doc(db, "len_users", deposit.user_id);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return NextResponse.json(
      { ok: false, error: `Usuario ${deposit.user_id} no encontrado`, code: "USER_NOT_FOUND" },
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

  // ── 6. Convertir centavos MXN → string con 2 decimales ────────────────────
  // Cuenca envía amount en centavos: 10000 = $100.00 MXN
  // MEXCOIN tiene 2 decimales: 10000 unidades = 100.00 MEXCOIN
  const amountStr = (deposit.amount / 100).toFixed(2);
  const txRef = `SPEI:${deposit.transaction_id}`;

  // ── 7. Mintear MEXCOIN en Celo ─────────────────────────────────────────────
  let txHash: string;
  try {
    txHash = await mintMexcoin(celoAddress, amountStr, txRef);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[deposit] Error minteando MEXCOIN para ${deposit.user_id}:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}`, code: "MINT_FAILED" },
      { status: 500 }
    );
  }

  // ── 8. Registrar evento como procesado (idempotencia) ─────────────────────
  await setDoc(eventRef, {
    event_id:     event.id,
    event_type:   event.type,
    user_id:      deposit.user_id,
    amount_cents: deposit.amount,
    amount_mxn:   amountStr,
    celo_address: celoAddress,
    tx_hash:      txHash,
    processed_at: serverTimestamp(),
  });

  // ── 9. Registrar transacción en historial del usuario ─────────────────────
  const txRef2 = doc(db, "len_transactions", txHash);
  await setDoc(txRef2, {
    type:         "deposit",
    user_id:      deposit.user_id,
    amount_mxn:   amountStr,
    amount_token: amountStr,
    token:        "MEXCOIN",
    tx_hash:      txHash,
    spei_ref:     deposit.transaction_id,
    sender_name:  deposit.sender_name,
    sender_clabe: deposit.sender_clabe,
    status:       "completed",
    created_at:   serverTimestamp(),
  });

  console.log(`[deposit] ✓ ${amountStr} MEXCOIN minteado para ${deposit.user_id} | tx: ${txHash}`);

  return NextResponse.json({
    ok: true,
    data: {
      user_id:      deposit.user_id,
      amount_mxn:   amountStr,
      mexcoin_minted: amountStr,
      celo_tx_hash: txHash,
    },
  });
}
