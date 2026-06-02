/**
 * POST /api/webhooks/conduit/deposit
 *
 * Conduit notifica el ciclo de vida completo de cada transacción.
 * Para el on-ramp USA → LATAM solo nos interesan ciertos eventos.
 *
 * Eventos suscritos (configurados en dashboard Conduit):
 *   • transaction.created             → log
 *   • transaction.compliance_rejected → bloquear
 *   • transaction.funds_received      → log (intermedio)
 *   • transaction.completed           → ★ MINT MEXCOIN/QUETZA/LEMPI ★
 *   • transaction.cancelled           → no minteamos
 *   • transaction.withdrawal_processed → confirmar payout SPEI/ACH saliente
 *
 * Verificación de firma: header "conduit-signature" + "conduit-signature-timestamp"
 * Idempotencia: usa event_sequence como doc id en len_processed_webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyConduitWebhook } from "@/lib/conduit-client";
import { mintMexcoin } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import type {
  ApiResponse,
  ConduitWebhookEvent,
  ConduitPayin,
} from "@/types/conduit";
import type { Address } from "viem";

const PROCESSED_EVENTS_COLLECTION = "len_processed_webhooks";

// Tipo de cambio aplicado en el momento del minteo. Para producción debe venir
// de Conduit getQuote() o de un oracle. Hardcoded para sandbox.
const USD_TO_MXN = 18.7;
const USD_TO_GTQ = 7.8;
const USD_TO_HNL = 24.8;

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Verificar firma HMAC ──────────────────────────────────────────────
  const rawBody = await req.text();
  if (!verifyConduitWebhook(rawBody, {
    signature: req.headers.get("conduit-signature"),
    timestamp: req.headers.get("conduit-signature-timestamp"),
  })) {
    return NextResponse.json(
      { ok: false, error: "Firma inválida", code: "INVALID_SIGNATURE" },
      { status: 401 },
    );
  }

  // ── 2. Parsear evento ─────────────────────────────────────────────────────
  let event: ConduitWebhookEvent<ConduitPayin>;
  try {
    event = JSON.parse(rawBody) as ConduitWebhookEvent<ConduitPayin>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" },
      { status: 400 },
    );
  }

  // ── 3. Idempotencia (usa event_sequence) ─────────────────────────────────
  const db        = getAdminDb();
  const docId     = `conduit-${event.event_sequence}`;
  const eventRef  = db.collection(PROCESSED_EVENTS_COLLECTION).doc(docId);
  if ((await eventRef.get()).exists) {
    return NextResponse.json({ ok: true, data: { already_processed: true } });
  }

  // ── 4. Solo procesamos transaction.completed para minteo ─────────────────
  // Los demás eventos se acknowledgan sin acción (Conduit espera 2xx).
  if (event.event !== "transaction.completed") {
    // Log el evento pero no actúes (sólo para visibilidad)
    console.log(`[conduit] ignorando evento ${event.event} (seq ${event.event_sequence})`);
    await eventRef.set({
      event:         event.event,
      event_sequence: event.event_sequence,
      conduit_id:    event.data?.id ?? null,
      acknowledged_only: true,
      processed_at:  new Date(),
    });
    return NextResponse.json({ ok: true, data: { acknowledged: event.event } });
  }

  // ── 5. Buscar usuario LEN por customer_id de Conduit ─────────────────────
  const { data } = event;
  const userQuery = await db
    .collection("len_users")
    .where("conduit_customer_id", "==", data.customer_id)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.error(`[conduit/deposit] Usuario con conduit_customer_id=${data.customer_id} no encontrado`);
    return NextResponse.json(
      { ok: false, error: "Usuario no encontrado", code: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  const userDoc     = userQuery.docs[0];
  const userId      = userDoc.id;
  const userData    = userDoc.data();
  const celoAddress = userData.celo_address as Address | undefined;
  const country     = userData.country as "MX" | "GT" | "HN" | undefined;

  if (!celoAddress) {
    return NextResponse.json(
      { ok: false, error: "Usuario sin wallet Celo", code: "NO_CELO_WALLET" },
      { status: 422 },
    );
  }

  // ── 6. Calcular monto destino y token ────────────────────────────────────
  const usdAmount = parseFloat(data.destination_amount);

  let localAmount: string;
  let token: "MEXCOIN" | "QUETZA" | "LEMPI";
  let mintFn: ((to: Address, amount: string, ref: string) => Promise<string>) | null = null;

  switch (country) {
    case "MX":
      localAmount = (usdAmount * USD_TO_MXN).toFixed(2);
      token       = "MEXCOIN";
      mintFn      = mintMexcoin;
      break;
    case "GT":
      localAmount = (usdAmount * USD_TO_GTQ).toFixed(2);
      token       = "QUETZA";
      return NextResponse.json(
        { ok: false, error: "QUETZA mint pendiente de implementar", code: "NOT_IMPLEMENTED" },
        { status: 501 },
      );
    case "HN":
      localAmount = (usdAmount * USD_TO_HNL).toFixed(2);
      token       = "LEMPI";
      return NextResponse.json(
        { ok: false, error: "LEMPI mint pendiente de implementar", code: "NOT_IMPLEMENTED" },
        { status: 501 },
      );
    default:
      return NextResponse.json(
        { ok: false, error: `País no soportado: ${country}`, code: "COUNTRY_UNSUPPORTED" },
        { status: 422 },
      );
  }

  // ── 7. Mintear token en Celo ─────────────────────────────────────────────
  let txHash: string;
  try {
    txHash = await mintFn(celoAddress, localAmount, `CONDUIT:${data.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[conduit/deposit] Error minteando ${token} para ${userId}:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}`, code: "MINT_FAILED" },
      { status: 500 },
    );
  }

  // ── 8. Registrar en Firestore (paralelo) ─────────────────────────────────
  await Promise.all([
    eventRef.set({
      event:          event.event,
      event_sequence: event.event_sequence,
      conduit_id:     data.id,
      user_id:        userId,
      usd_amount:     usdAmount.toFixed(2),
      local_amount:   localAmount,
      token,
      tx_hash:        txHash,
      processed_at:   new Date(),
    }),
    db.collection("len_transactions").doc(txHash).set({
      type:          "deposit_usa",
      source:        "conduit",
      user_id:       userId,
      method:        data.method,
      usd_amount:    usdAmount.toFixed(2),
      local_amount:  localAmount,
      token,
      celo_tx_hash:  txHash,
      conduit_payin_id: data.id,
      reference:     data.reference,
      sender_name:   data.sender_name ?? null,
      status:        "completed",
      created_at:    new Date(),
    }),
  ]);

  console.log(
    `[conduit/deposit] ✓ $${usdAmount} USD → ${localAmount} ${token} ` +
    `para ${userId} | conduit: ${data.id} | tx: ${txHash}`,
  );

  return NextResponse.json({
    ok: true,
    data: {
      user_id:          userId,
      usd_amount:       usdAmount.toFixed(2),
      local_amount:     localAmount,
      token,
      celo_tx_hash:     txHash,
      conduit_payin_id: data.id,
    },
  });
}
