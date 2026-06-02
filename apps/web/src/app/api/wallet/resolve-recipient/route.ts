/**
 * POST /api/wallet/resolve-recipient
 * Resuelve un destinatario por teléfono → user_id real (usr_*).
 * Requiere JWT. Devuelve datos públicos (sin PIN).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getUserByPhone } from "@/lib/users-db";

const COUNTRY_COIN: Record<string, string> = { GT: "QUETZA", MX: "MEXCOIN", HN: "LEMPI" };

export async function POST(req: NextRequest) {
  const senderId = await verifyAuth(req);
  if (!senderId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: { recipient?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  const recipient = (body.recipient ?? "").trim();
  if (!recipient) return NextResponse.json({ ok: false, error: "Destinatario requerido" }, { status: 400 });

  const user = await getUserByPhone(recipient);
  if (!user || user.status !== "active") {
    return NextResponse.json({ ok: false, error: "No encontramos un usuario LEN con ese número" }, { status: 404 });
  }
  if (user.user_id === senderId) {
    return NextResponse.json({ ok: false, error: "No puedes enviarte a ti mismo" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      userId:        user.user_id,
      displayName:   user.display_name,
      country:       user.country,
      kycLevel:      user.kyc_level ?? 0,
      walletAddress: user.phone,
      coin:          COUNTRY_COIN[user.country] ?? "QUETZA",
    },
  });
}
