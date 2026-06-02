/**
 * /api/kyc
 *   GET  → estado KYC del usuario autenticado (nivel, status, límites)
 *   POST → enviar documentos KYC (DPI, selfie, recibo) → estado in_review
 *
 * Requiere JWT (Authorization: Bearer ...).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getKycStatus, submitKyc, KYC_LEVELS, REQUIRED_DOCS_VERIFIED, type KycDocType } from "@/lib/identity";

const DOC_TYPES: KycDocType[] = ["dpi_front", "dpi_back", "selfie", "utility_bill"];

export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const status = await getKycStatus(userId);
  return NextResponse.json({
    ok: true,
    data: { ...status, levels: KYC_LEVELS, required_for_verified: REQUIRED_DOCS_VERIFIED },
  });
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: { documents?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const docs: Partial<Record<KycDocType, string>> = {};
  for (const t of DOC_TYPES) {
    const v = body.documents?.[t];
    if (typeof v === "string" && v.startsWith("data:")) docs[t] = v;
  }
  if (Object.keys(docs).length === 0) {
    return NextResponse.json({ ok: false, error: "No se enviaron documentos válidos" }, { status: 400 });
  }

  try {
    const submission = await submitKyc(userId, docs);
    return NextResponse.json({ ok: true, data: submission });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al enviar KYC";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
