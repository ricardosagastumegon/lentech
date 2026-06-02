/**
 * POST /api/admin/users/reset-pin
 * Body: { user_id, new_pin }
 *
 * Resetea el PIN de un usuario (re-hashea).
 * Auth: Bearer LEN_ADMIN_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { updateUserPin } from "@/lib/users-db";

export async function POST(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  let body: { user_id?: string; new_pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  if (!body.user_id || !body.new_pin) {
    return NextResponse.json(
      { ok: false, error: "user_id y new_pin requeridos" },
      { status: 400 },
    );
  }
  try {
    const ok = await updateUserPin(body.user_id, body.new_pin);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: { user_id: body.user_id, pin_reset: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
