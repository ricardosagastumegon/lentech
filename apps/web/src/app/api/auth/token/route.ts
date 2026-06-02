/**
 * POST /api/auth/token
 *
 * Autentica un usuario por phone + PIN contra Firestore.
 * Retorna JWT firmado (HS256, 24h).
 *
 * Body: { phone, pin }
 * Response success: { ok: true, data: { access_token, expires_in, user } }
 * Response fail:    { ok: false, error, code }
 *
 * Seguridad:
 *   • PIN verificado con scrypt (timing-safe)
 *   • Sólo usuarios con status="active"
 *   • Rate-limit recomendado a nivel infra (Railway/Cloudflare)
 *   • No revela si el usuario existe o no (mismo error para ambos)
 */

import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { authenticateUser } from "@/lib/users-db";

// Tiempo mínimo del response para evitar timing attacks (revela existencia)
const MIN_RESPONSE_MS = 200;

async function delayUntil(startMs: number) {
  const elapsed = Date.now() - startMs;
  const remaining = MIN_RESPONSE_MS - elapsed;
  if (remaining > 0) {
    await new Promise(r => setTimeout(r, remaining));
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: { phone?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const phone = body.phone?.trim();
  const pin   = body.pin?.trim();

  if (!phone || !pin) {
    return NextResponse.json(
      { ok: false, error: "phone y pin requeridos", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }

  try {
    // Autenticar contra Firestore
    const user = await authenticateUser(phone, pin);
    await delayUntil(start);

    if (!user) {
      // Mensaje genérico — no reveles si el usuario existe o no
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas", code: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    // Firmar JWT
    const accessToken = await signToken({
      sub:     user.user_id,
      country: user.country,
      role:    user.role,
    });

    return NextResponse.json({
      ok: true,
      data: {
        access_token: accessToken,
        expires_in:   86400,
        user: {
          user_id:      user.user_id,
          display_name: user.display_name,
          country:      user.country,
          role:         user.role,
          celo_address: user.celo_address ?? null,
        },
      },
    });
  } catch (e) {
    // Devuelve SIEMPRE JSON (evita "Unexpected end of JSON input" en el cliente).
    // El mensaje ayuda a diagnosticar config de entorno (Firebase Admin / JWT secret).
    console.error("[auth/token] error:", e);
    const msg = e instanceof Error ? e.message : "Error interno del servidor";
    return NextResponse.json(
      { ok: false, error: msg, code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
