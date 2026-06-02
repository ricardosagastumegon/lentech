/**
 * Autenticación JWT para las API routes de LEN.
 * Usa jose (Web Crypto API, sin dependencias nativas) con HMAC-SHA256.
 *
 * Variable de entorno requerida:
 *   LEN_JWT_SECRET — mínimo 32 caracteres, generado con: openssl rand -hex 32
 *
 * Uso:
 *   const userId = await verifyAuth(req);
 *   if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { type NextRequest } from "next/server";

const JWT_ALG = "HS256";
const JWT_EXPIRY = "24h";

function getSecret(): Uint8Array {
  const secret = process.env.LEN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LEN_JWT_SECRET debe tener al menos 32 caracteres. Genera uno con: openssl rand -hex 32");
  }
  return new TextEncoder().encode(secret);
}

// ── Firmar JWT ────────────────────────────────────────────────────────────────

export async function signToken(payload: {
  sub:     string;   // user_id
  country: string;
  role:    "user" | "admin" | "demo";
}): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setIssuer("len.app")
    .sign(getSecret());
}

// ── Verificar JWT ─────────────────────────────────────────────────────────────

interface LenTokenPayload extends JWTPayload {
  sub:     string;
  country: string;
  role:    "user" | "admin" | "demo";
}

export async function verifyToken(token: string): Promise<LenTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer:    "len.app",
      algorithms: [JWT_ALG],
    });
    return payload as LenTokenPayload;
  } catch {
    return null;
  }
}

// ── Helper para API routes ────────────────────────────────────────────────────

export async function verifyAuth(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token   = auth.slice(7);
  const payload = await verifyToken(token);
  return payload?.sub ?? null;
}
