/**
 * POST /api/admin/homologate
 * Homologa la cuenta interna de un usuario con su cuenta Banrural REAL.
 * Tras esto, la clave canónica de reconciliación pasa a ser la cuenta del banco.
 *
 * Body: { user_id? | phone?, bank_account_number }
 * Auth: admin key (Bearer LEN_ADMIN_API_KEY).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getUserById, getUserByPhone, updateUser } from "@/lib/users-db";

function bad(error: string, code = 400) {
  return NextResponse.json({ ok: false, error }, { status: code });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminAuth(req)) return bad("UNAUTHORIZED", 401);

  let body: { user_id?: string; phone?: string; bank_account_number?: string };
  try { body = await req.json(); } catch { return bad("JSON inválido"); }

  const bankNum = (body.bank_account_number ?? "").replace(/\D/g, "");
  if (bankNum.length < 6) return bad("Número de cuenta Banrural inválido");

  const user = body.user_id
    ? await getUserById(body.user_id)
    : body.phone ? await getUserByPhone(body.phone) : null;
  if (!user) return bad("Usuario no encontrado", 404);

  const updated = await updateUser(user.user_id, {
    bank_account_number: bankNum,
    account_type: "bank",
  });

  return NextResponse.json({
    ok: true,
    data: {
      user_id:             user.user_id,
      display_name:        updated?.display_name ?? user.display_name,
      account_number:      user.account_number ?? null,   // interna (se conserva)
      bank_account_number: bankNum,                        // Banrural real (homologada)
      account_type:        "bank",
    },
  });
}
