/**
 * GET /api/admin/aml — lista las alertas AML (umbral ≥US$10K + structuring).
 * Auth: admin key. Base para el reporte a UIF/IVE-SIB.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { listAmlAlerts } from "@/lib/aml";

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const alerts = await listAmlAlerts();
  return NextResponse.json({ ok: true, data: alerts });
}
