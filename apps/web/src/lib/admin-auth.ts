/**
 * Auth para endpoints /api/admin/*
 *
 * Modelo: single-admin con API key compartida en `LEN_ADMIN_API_KEY`.
 * El admin panel envía: `Authorization: Bearer <key>` en cada request.
 *
 * Sólo hay un admin (el operador LEN) — no requiere multi-user JWT.
 * Cuando crezca el equipo, migrar a roles + JWT con `role: "admin"`.
 */

import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

const MIN_KEY_LENGTH = 32;

/**
 * Verifica que el request lleve `Authorization: Bearer <LEN_ADMIN_API_KEY>`.
 * Usa comparación timing-safe.
 */
export function verifyAdminAuth(req: NextRequest): boolean {
  const expected = process.env.LEN_ADMIN_API_KEY;
  if (!expected || expected.length < MIN_KEY_LENGTH) {
    console.error("[admin-auth] LEN_ADMIN_API_KEY no configurado o muy corto");
    return false;
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const provided = auth.slice("Bearer ".length).trim();

  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
