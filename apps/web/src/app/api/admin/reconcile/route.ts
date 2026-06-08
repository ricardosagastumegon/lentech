/**
 * /api/admin/reconcile — proof-of-reserves vivo (C1).
 * GET  → corre la reconciliación; si hay descuadre, CONGELA mint/burn automáticamente.
 * POST → registra reservas bancarias { reserves: {coin: monto} } y/o setea freeze { freeze, reason }.
 * Auth: admin key.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { reconcile, setReserves, setFreeze, getFreeze } from "@/lib/reconciliation";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const report = await reconcile();
  // Auto-freeze ante descuadre (la invariante es viva, no un reporte pasivo).
  if (!report.ok) await setFreeze(true, "Descuadre detectado en reconciliación automática");
  const freeze = await getFreeze();

  return NextResponse.json({ ok: true, data: { ...report, freeze } });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminAuth(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: { reserves?: Record<string, number>; freeze?: boolean; reason?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  if (body.reserves) await setReserves(body.reserves);
  if (typeof body.freeze === "boolean") await setFreeze(body.freeze, body.reason);

  const report = await reconcile();
  const freeze = await getFreeze();
  return NextResponse.json({ ok: true, data: { ...report, freeze } });
}
