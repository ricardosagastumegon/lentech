/**
 * GET /api/wallet/balance
 * Saldo del usuario autenticado, leído del LEDGER (fuente de verdad).
 * Devuelve forma compatible con el wallet store del cliente.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getBalances } from "@/lib/ledger";
import { getUserById } from "@/lib/users-db";
import { railCoin } from "@/lib/rails";

const COIN_FIAT: Record<string, string> = { QUETZA: "GTQ", MEXCOIN: "MXN", LEMPI: "HNL" };

export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const balances = await getBalances(userId);

  // Si aún no tiene asientos, expone su coin de país con saldo 0.
  if (balances.length === 0) {
    const user = await getUserById(userId);
    const coin = railCoin(user?.country ?? "GT");
    balances.push({ coin, balance: 0 });
  }

  const wallets = balances.map(b => ({
    coin:         b.coin,
    balance:      b.balance.toFixed(2),
    available:    b.balance.toFixed(2),
    fiatBalance:  "0",
    fiatCurrency: COIN_FIAT[b.coin] ?? "USD",
    balanceUSD:   0,
  }));

  return NextResponse.json({ ok: true, data: { wallets } });
}
