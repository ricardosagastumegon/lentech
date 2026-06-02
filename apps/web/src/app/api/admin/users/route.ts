/**
 * GET    /api/admin/users          → lista usuarios
 * POST   /api/admin/users          → crea usuario
 * PATCH  /api/admin/users?id=X     → actualiza usuario (no PIN)
 * DELETE /api/admin/users?id=X     → soft-delete (status = "deleted")
 *
 * Endpoints adicionales:
 *   POST /api/admin/users/reset-pin  → resetear PIN de un usuario
 *
 * Auth: Bearer LEN_ADMIN_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  listUsers,
  createUser,
  updateUser,
  softDeleteUser,
} from "@/lib/users-db";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
  const users = await listUsers(limit);
  return NextResponse.json({ ok: true, data: users });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  let body: {
    phone?:               string;
    display_name?:        string;
    country?:             "MX" | "GT" | "HN";
    pin?:                 string;
    celo_address?:        string;
    conduit_customer_id?: string;
    role?:                "user" | "admin";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  if (!body.phone || !body.display_name || !body.country || !body.pin) {
    return NextResponse.json(
      { ok: false, error: "Campos requeridos: phone, display_name, country, pin" },
      { status: 400 },
    );
  }

  try {
    const user = await createUser({
      phone:               body.phone,
      display_name:        body.display_name,
      country:             body.country,
      pin:                 body.pin,
      celo_address:        body.celo_address,
      conduit_customer_id: body.conduit_customer_id,
      role:                body.role,
    });
    return NextResponse.json({ ok: true, data: user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  let updates: Record<string, unknown>;
  try {
    updates = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  // Nunca permitir cambiar pin_hash directamente desde PATCH (usar reset-pin)
  delete updates.pin_hash;
  delete updates.pin;

  const updated = await updateUser(userId, updates);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }
  const ok = await softDeleteUser(userId);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { user_id: userId, status: "deleted" } });
}
