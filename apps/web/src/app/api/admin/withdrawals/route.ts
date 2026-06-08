/**
 * /api/admin/withdrawals — operación de la saga de retiro.
 * GET  → lista retiros (opcional ?status=pending_payout|settled|failed_compensated).
 * POST → { ref, action: "settle" | "fail" }
 *        settle = el banco confirmó el pago; fail = el pago falló → compensa (re-acredita).
 * Auth: admin key.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { listWithdrawals, settleWithdrawal, failWithdrawal, type WithdrawalStatus } from "@/lib/withdrawals";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") as WithdrawalStatus | null;
  const items = await listWithdrawals(status ?? undefined);
  return NextResponse.json({ ok: true, data: items });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminAuth(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: { ref?: string; action?: "settle" | "fail" };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }
  if (!body.ref || (body.action !== "settle" && body.action !== "fail")) {
    return NextResponse.json({ ok: false, error: "ref y action (settle|fail) requeridos" }, { status: 400 });
  }

  const done = body.action === "settle"
    ? await settleWithdrawal(body.ref)
    : await failWithdrawal(body.ref);

  if (!done) return NextResponse.json({ ok: false, error: "Retiro no encontrado o ya resuelto" }, { status: 409 });
  return NextResponse.json({ ok: true, data: { ref: body.ref, action: body.action } });
}
