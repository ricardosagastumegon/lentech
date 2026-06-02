/**
 * POST /api/auth/register
 *
 * Registro de usuario nuevo con KYC nivel bancario.
 * Body: {
 *   phone, display_name, country (MX|GT|HN), pin,
 *   documents?: { dpi_front, dpi_back, selfie, utility_bill }  // dataURL reducido
 * }
 * Respuesta: { ok, data: { access_token, user } }
 *
 * Flujo:
 *   1. createUser (PIN hasheado con scrypt, phone único)
 *   2. submitKyc con los documentos provistos → estado "in_review"
 *   3. emite JWT (auto-login)
 */

import { NextRequest, NextResponse } from "next/server";
import { createUser, type UserCountry } from "@/lib/users-db";
import { submitKyc, type KycDocType } from "@/lib/identity";
import { signToken } from "@/lib/auth";

const MIN_RESPONSE_MS = 150;
const VALID_COUNTRIES: UserCountry[] = ["MX", "GT", "HN"];
const DOC_TYPES: KycDocType[] = ["dpi_front", "dpi_back", "selfie", "utility_bill"];

function bad(error: string, code = 400) {
  return NextResponse.json({ ok: false, error }, { status: code });
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: {
    phone?: string; display_name?: string; country?: string; pin?: string;
    documents?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return bad("JSON inválido");
  }

  const { phone, display_name, country, pin } = body;
  if (!phone || !display_name || !country || !pin) {
    return bad("Faltan campos requeridos: phone, display_name, country, pin");
  }
  if (!VALID_COUNTRIES.includes(country as UserCountry)) {
    return bad("country debe ser MX, GT o HN");
  }
  if (String(pin).length < 6) {
    return bad("El PIN debe tener al menos 6 dígitos");
  }

  try {
    const user = await createUser({
      phone,
      display_name,
      country: country as UserCountry,
      pin,
    });

    // KYC — guarda los documentos provistos (best-effort, no bloquea el registro)
    if (body.documents && typeof body.documents === "object") {
      const docs: Partial<Record<KycDocType, string>> = {};
      for (const t of DOC_TYPES) {
        const v = body.documents[t];
        if (typeof v === "string" && v.startsWith("data:")) docs[t] = v;
      }
      if (Object.keys(docs).length > 0) {
        try {
          await submitKyc(user.user_id, docs);
        } catch (e) {
          console.warn("[register] submitKyc falló (registro continúa):", e);
        }
      }
    }

    const token = await signToken({ sub: user.user_id, country: user.country, role: user.role });

    const elapsed = Date.now() - start;
    if (elapsed < MIN_RESPONSE_MS) await new Promise(r => setTimeout(r, MIN_RESPONSE_MS - elapsed));

    return NextResponse.json({ ok: true, data: { access_token: token, expires_in: 86400, user } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al registrar";
    return bad(msg, 400);
  }
}
