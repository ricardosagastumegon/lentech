/**
 * /api/kyb — onboarding empresarial (KYB/UBO).
 * GET  → estado KYB del usuario autenticado.
 * POST → envía la submission KYB (datos empresa + representante + UBOs + documentos).
 * Auth: JWT (verifyAuth).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { submitKyb, getKybStatus, type KybInput } from "@/lib/kyb";

export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const submission = await getKybStatus(userId);
  return NextResponse.json({ ok: true, data: submission });
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: KybInput;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  try {
    const submission = await submitKyb(userId, body);
    return NextResponse.json({
      ok: true,
      data: { status: submission.status, legal_name: submission.legal_name, ubos: submission.ubos.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al procesar KYB";
    return NextResponse.json({ ok: false, error: msg }, { status: 422 });
  }
}
