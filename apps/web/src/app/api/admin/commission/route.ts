/**
 * GET  /api/admin/commission         → lista todas las reglas
 * GET  /api/admin/commission?id=X    → una regla específica
 * PUT  /api/admin/commission         → actualiza una regla (body con rule_id + cambios)
 * POST /api/admin/commission/preview → calcula preview de comisión (rule_id + gross_amount)
 *
 * Auth: Bearer LEN_ADMIN_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  listCommissionRules,
  updateCommissionRule,
  getCommissionRule,
  type CommissionOperation,
  type CommissionCountry,
} from "@/lib/commission-config";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id  = url.searchParams.get("id");

  if (id) {
    // Formato esperado: deposit_GT, withdrawal_MX, etc.
    const [operation, country] = id.split("_");
    if (!operation || !country) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }
    try {
      const rule = await getCommissionRule(
        operation as CommissionOperation,
        country as CommissionCountry,
      );
      return NextResponse.json({ ok: true, data: rule });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      return NextResponse.json({ ok: false, error: msg }, { status: 404 });
    }
  }

  const rules = await listCommissionRules();
  return NextResponse.json({ ok: true, data: rules });
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { rule_id: string; updates: Record<string, unknown>; admin_user?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  const { rule_id, updates, admin_user } = body;
  if (!rule_id || !updates) {
    return NextResponse.json({ ok: false, error: "rule_id y updates requeridos" }, { status: 400 });
  }

  try {
    const updated = await updateCommissionRule(rule_id, updates, admin_user ?? "admin");
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
