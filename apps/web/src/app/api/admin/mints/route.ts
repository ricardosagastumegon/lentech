/**
 * GET /api/admin/mints?limit=50&country=GT
 *
 * Lista los últimos mints manuales (panel admin).
 * Auth: Bearer LEN_ADMIN_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url     = new URL(req.url);
  const limit   = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const country = url.searchParams.get("country") as "MX" | "GT" | "HN" | null;

  const db = getAdminDb();
  let query = db.collection("len_admin_mints").orderBy("created_at", "desc").limit(limit);
  if (country && ["MX", "GT", "HN"].includes(country)) {
    query = db.collection("len_admin_mints")
      .where("country", "==", country)
      .orderBy("created_at", "desc")
      .limit(limit);
  }

  const snap = await query.get();
  const mints = snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      created_at: data.created_at?.toDate?.().toISOString() ?? data.created_at,
    };
  });

  return NextResponse.json({ ok: true, data: mints });
}
