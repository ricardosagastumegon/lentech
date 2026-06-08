/**
 * POST /api/wallet/withdraw
 * Retiro: quema (debita) el monto del ledger del usuario y aplica comisión.
 * El NET (monto − comisión) se paga en fiat al banco vía SPEI/ACH (off-ledger, pendiente).
 *
 * Body: { amount, bankName?, accountLast4? }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { postEntries, type LedgerLeg } from "@/lib/ledger";
import { getUserById } from "@/lib/users-db";
import { getCommissionRule, calculateCommission, type CommissionCountry } from "@/lib/commission-config";
import { randomUUID } from "crypto";
import { railCoin } from "@/lib/rails";
import { checkLimits, limitMessage } from "@/lib/limits";
import { isFrozen } from "@/lib/reconciliation";
import { recordWithdrawal } from "@/lib/withdrawals";
import { screenTransaction } from "@/lib/aml";

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  if (await isFrozen()) return NextResponse.json({ ok: false, error: "Sistema en pausa por reconciliación" }, { status: 503 });

  let body: { amount?: number | string; bankName?: string; accountLast4?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  const amount = Number(body.amount);
  if (!(amount > 0)) return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });

  try {
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    const coin = railCoin(user.country);

    const limit = await checkLimits({ userId, kycLevel: user.kyc_level, coin, amount, aggregate: true });
    if (!limit.ok) return NextResponse.json({ ok: false, error: limitMessage(limit) }, { status: 422 });

    const rule = await getCommissionRule("withdrawal", user.country as CommissionCountry);
    const calc = calculateCommission(rule, amount);

    const ref  = `wd_${userId}_${Date.now()}_${randomUUID()}`;
    const dest = body.bankName ? `${body.bankName}${body.accountLast4 ? ` ···${body.accountLast4}` : ""}` : "tu banco";

    // Débito bruto al usuario + comisión a los splits (atómico). El NET sale como fiat (off-ledger).
    const legs: LedgerLeg[] = [
      {
        entry_id: `${ref}__withdraw`, user_id: userId, coin,
        direction: "debit", amount, type: "withdraw", ref,
        description: `Retiro → ${dest}`,
      },
    ];
    calc.split_breakdown.forEach((s, i) => {
      if (s.amount > 0) legs.push({
        entry_id: `${ref}__fee_${i}`, user_id: s.recipient_id, coin,
        direction: "credit", amount: s.amount, type: "fee", ref,
        description: `Comisión retiro (${s.name})`, counterparty: userId,
      });
    });

    await postEntries(legs);

    // Saga: registrar la obligación de pago. Si el pago fiat falla, se compensa (re-acredita).
    await recordWithdrawal({
      ref, user_id: userId, coin, gross: amount, fee: calc.fee_amount, net: calc.net_amount,
      splits: calc.split_breakdown.map(s => ({ recipient_id: s.recipient_id, amount: s.amount, name: s.name })),
      destination: dest,
    });
    await screenTransaction({ userId, coin, amount, ref, type: "withdraw" });

    return NextResponse.json({
      ok: true,
      data: {
        ref, coin, gross: amount, fee: calc.fee_amount, net: calc.net_amount,
        fee_percent: calc.fee_percent_used, status: "pending", destination: dest,
      },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ ok: false, error: "Saldo insuficiente para este retiro" }, { status: 422 });
    }
    console.error("[wallet/withdraw] error:", e);
    return NextResponse.json({ ok: false, error: "No se pudo procesar el retiro" }, { status: 500 });
  }
}
