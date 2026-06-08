/**
 * POST /api/wallet/transfer
 * Envío / swap autoritativo — escribe en el LEDGER (fuente de verdad).
 *
 * Body: { toUserId?, toName?, fromCoin, toCoin, fromAmount, description? }
 *   - same coin  → transferencia P2P (debita emisor, acredita receptor neto)
 *   - cross coin → swap FX (calculado server-side con fx-engine)
 *   - sin toUserId (o == emisor) → swap a sí mismo (cambia su propio portafolio)
 *
 * El cliente NO decide montos: el servidor recalcula el FX y valida saldo.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { postEntries, type LedgerLeg } from "@/lib/ledger";
import { calculateFXQuote } from "@/lib/fx-engine";
import { getUserById } from "@/lib/users-db";
import { checkLimits, limitMessage } from "@/lib/limits";
import { screenTransaction } from "@/lib/aml";
import type { CoinCode } from "@/store/wallet.store";
import { randomUUID } from "crypto";

const TREASURY = "len_treasury";

const COINS: CoinCode[] = ["QUETZA", "MEXCOIN", "LEMPI", "COLON", "DOLAR", "TIKAL", "NICORD", "CORI"];

function bad(error: string, code = 400) {
  return NextResponse.json({ ok: false, error, code }, { status: code });
}

export async function POST(req: NextRequest) {
  const senderId = await verifyAuth(req);
  if (!senderId) return bad("UNAUTHORIZED", 401);

  let body: {
    toUserId?: string; toName?: string;
    fromCoin?: string; toCoin?: string; fromAmount?: number | string; description?: string;
  };
  try { body = await req.json(); } catch { return bad("JSON inválido"); }

  const fromCoin = body.fromCoin as CoinCode;
  const toCoin   = body.toCoin as CoinCode;
  const amount   = Number(body.fromAmount);

  if (!COINS.includes(fromCoin) || !COINS.includes(toCoin)) return bad("Moneda inválida");
  if (!(amount > 0)) return bad("Monto inválido");

  // FX server-side (no confiamos en el cliente)
  const quote    = calculateFXQuote(fromCoin, toCoin, amount);
  const toAmount = Math.round(quote.toAmount * 100) / 100;
  const fee      = Math.round(quote.feeAmount * 100) / 100;
  if (!(toAmount > 0)) return bad("El monto es demasiado pequeño para convertir");

  // Límite por nivel KYC (single + acumulado de salida) — cierra C4.
  const sender = await getUserById(senderId);
  const limit  = await checkLimits({ userId: senderId, kycLevel: sender?.kyc_level, coin: fromCoin, amount, aggregate: true });
  if (!limit.ok) return bad(limitMessage(limit), 422);

  const recipient = body.toUserId && body.toUserId !== senderId ? body.toUserId : senderId;
  const isFx      = fromCoin !== toCoin;
  const ref       = `tx_${senderId}_${Date.now()}_${randomUUID()}`;
  const desc      = body.description || (isFx ? "Swap" : `Envío${body.toName ? ` a ${body.toName}` : ""}`);

  // Asientos atómicos: débito emisor + crédito receptor + comisión a treasury (doble entrada).
  const legs: LedgerLeg[] = [
    {
      entry_id: `${ref}__out`, user_id: senderId, coin: fromCoin,
      direction: "debit", amount, type: isFx ? "fx_out" : "transfer_out",
      ref, counterparty: recipient === senderId ? undefined : recipient,
      counterparty_name: recipient === senderId ? undefined : body.toName, description: desc,
    },
    {
      entry_id: `${ref}__in`, user_id: recipient, coin: toCoin,
      direction: "credit", amount: toAmount, type: isFx ? "fx_in" : "transfer_in",
      ref, counterparty: recipient === senderId ? undefined : senderId, description: desc,
    },
  ];
  if (fee > 0) {
    legs.push({
      entry_id: `${ref}__fee`, user_id: TREASURY, coin: fromCoin,
      direction: "credit", amount: fee, type: "fee", ref, counterparty: senderId,
      description: `Comisión · ${desc}`,
    });
  }

  try {
    await postEntries(legs);
    await screenTransaction({ userId: senderId, coin: fromCoin, amount, ref, type: isFx ? "swap" : "transfer" });
    return NextResponse.json({
      ok: true,
      data: { ref, fromCoin, toCoin, fromAmount: amount, toAmount, rate: quote.midRate, feePercent: quote.feePercent, feeAmount: fee },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "INSUFFICIENT_FUNDS") return bad("Saldo insuficiente para completar esta operación", 422);
    console.error("[wallet/transfer] error:", e);
    return bad("No se pudo procesar la transferencia", 500);
  }
}
