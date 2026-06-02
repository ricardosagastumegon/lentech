/**
 * GET /api/wallet/transactions
 * Historial del usuario autenticado, derivado de los asientos del LEDGER.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { listEntries, type LedgerEntry } from "@/lib/ledger";

function toTransaction(e: LedgerEntry) {
  const received = e.direction === "credit";
  return {
    id:          e.entry_id,
    type:        e.type === "transfer_in" || e.type === "transfer_out" ? "transfer"
                 : e.type === "fx_in" || e.type === "fx_out" ? "fx_swap"
                 : e.type === "deposit" ? "fiat_load"
                 : e.type === "withdraw" ? "fiat_withdraw" : "transfer",
    status:      "completed",
    direction:   received ? "received" : "sent",
    fromCoin:    e.coin,
    toCoin:      e.coin,
    fromAmount:  e.amount.toFixed(2),
    toAmount:    e.amount.toFixed(2),
    fee:         "0",
    description: e.description,
    counterparty: e.counterparty,
    createdAt:   new Date(e.created_at).toISOString(),
    completedAt: new Date(e.created_at).toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  const entries = await listEntries(userId, limit);
  return NextResponse.json({ ok: true, data: { items: entries.map(toTransaction) } });
}
