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
import { getBalance, postEntry } from "@/lib/ledger";
import { calculateFXQuote } from "@/lib/fx-engine";
import type { CoinCode } from "@/store/wallet.store";

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

  try {
    // Saldo autoritativo del emisor
    const senderBal = await getBalance(senderId, fromCoin);
    if (senderBal < amount) {
      return bad("Saldo insuficiente para completar esta operación", 422);
    }

    // FX server-side (no confiamos en el cliente)
    const quote   = calculateFXQuote(fromCoin, toCoin, amount);
    const toAmount = Math.round(quote.toAmount * 100) / 100;

    const recipient = body.toUserId && body.toUserId !== senderId ? body.toUserId : senderId;
    const isFx      = fromCoin !== toCoin;
    const ref       = `tx_${senderId}_${Date.now()}`;
    const desc      = body.description || (isFx ? "Swap" : `Envío${body.toName ? ` a ${body.toName}` : ""}`);

    // Débito al emisor (su fromCoin)
    await postEntry({
      entry_id: `${ref}__out`, user_id: senderId, coin: fromCoin,
      direction: "debit", amount, type: isFx ? "fx_out" : "transfer_out",
      ref, counterparty: recipient === senderId ? undefined : recipient, description: desc,
    });

    // Crédito al receptor (su toCoin) — al emisor mismo si es swap propio
    await postEntry({
      entry_id: `${ref}__in`, user_id: recipient, coin: toCoin,
      direction: "credit", amount: toAmount, type: isFx ? "fx_in" : "transfer_in",
      ref, counterparty: recipient === senderId ? undefined : senderId, description: desc,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ref, fromCoin, toCoin, fromAmount: amount, toAmount,
        rate: quote.midRate, feePercent: quote.feePercent, feeAmount: quote.feeAmount,
      },
    });
  } catch (e) {
    console.error("[wallet/transfer] error:", e);
    const msg = e instanceof Error ? e.message : "Error al procesar la transferencia";
    return bad(msg, 500);
  }
}
