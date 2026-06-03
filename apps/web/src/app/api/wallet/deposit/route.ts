/**
 * POST /api/wallet/deposit
 * Acredita un depósito fiat al ledger (simula la confirmación del banco: Banrural/Conekta).
 * Aplica comisión configurable (LEN Admin) y mintea NET al usuario + comisión a los splits.
 *
 * ⚠️ DEMO: en producción real el depósito lo dispara el WEBHOOK verificado del banco,
 *    NO el usuario. Gateado por DEMO_MODE (default permitido; poner DEMO_MODE=false en prod).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { postEntries, type LedgerLeg } from "@/lib/ledger";
import { getUserById } from "@/lib/users-db";
import { getCommissionRule, calculateCommission, type CommissionCountry } from "@/lib/commission-config";
import { randomUUID } from "crypto";

const COUNTRY_COIN: Record<string, string> = { GT: "QUETZA", MX: "MEXCOIN", HN: "LEMPI" };

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE === "false") {
    return NextResponse.json({ ok: false, error: "Depósito simulado deshabilitado" }, { status: 403 });
  }

  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: { amount?: number | string; source?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  const amount = Number(body.amount);
  if (!(amount > 0)) return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });

  try {
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    const coin = COUNTRY_COIN[user.country] ?? "QUETZA";

    const rule = await getCommissionRule("deposit", user.country as CommissionCountry);
    const calc = calculateCommission(rule, amount);

    const ref  = `dep_${userId}_${Date.now()}_${randomUUID()}`;
    const src  = body.source || (user.country === "GT" ? "Banrural" : user.country === "MX" ? "Conekta/SPEI" : "BAC");

    const legs: LedgerLeg[] = [
      {
        entry_id: `${ref}__deposit`, user_id: userId, coin,
        direction: "credit", amount: calc.net_amount, type: "deposit",
        ref, description: `Depósito ${src}`,
      },
    ];
    calc.split_breakdown.forEach((s, i) => {
      if (s.amount > 0) legs.push({
        entry_id: `${ref}__fee_${i}`, user_id: s.recipient_id, coin,
        direction: "credit", amount: s.amount, type: "fee", ref,
        description: `Comisión depósito (${s.name})`, counterparty: userId,
      });
    });

    await postEntries(legs);

    return NextResponse.json({
      ok: true,
      data: { coin, gross: calc.gross_amount, fee: calc.fee_amount, net: calc.net_amount, fee_percent: calc.fee_percent_used, source: src },
    });
  } catch (e) {
    console.error("[wallet/deposit] error:", e);
    return NextResponse.json({ ok: false, error: "No se pudo procesar el depósito" }, { status: 500 });
  }
}
