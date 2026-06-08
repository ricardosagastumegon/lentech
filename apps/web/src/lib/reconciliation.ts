/**
 * Reconciliación + invariante + freeze (ataca C1 de la auditoría: proof-of-reserves vivo).
 *
 * Invariante por moneda (ver docs/money-architecture.md):
 *   reserva_banco == pasivo_ledger == supply_on_chain   ± residuo_redondeo
 *
 * Aquí (sin feed de banco/chain todavía) se valida:
 *   1. Auto-consistencia del ledger: Σ(len_balances) == Σ(credits − debits) por coin.
 *   2. Si hay reservas registradas (admin): Σ(len_balances) == reserva.
 * Si algo se sale de tolerancia → se puede CONGELAR mint/burn (deposit/withdraw).
 *
 * Colecciones: len_balances, len_ledger_entries, len_system/{reserves,freeze}.
 */
import { getAdminDb } from "@/lib/firebase-admin";

const TOLERANCE = 0.01; // residuo de redondeo aceptable
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CoinRecon {
  coin:          string;
  ledgerBalance: number;        // Σ len_balances (pasivo del ledger)
  entriesNet:    number;        // Σ(credits − debits) de los asientos
  drift:         number;        // ledgerBalance − entriesNet (debe ser ~0)
  reserve:       number | null; // reserva bancaria registrada (si la hay)
  reserveDrift:  number | null; // ledgerBalance − reserve
  ok:            boolean;
}

/** Σ de saldos por coin (pasivo) desde len_balances. */
export async function ledgerSupplyByCoin(): Promise<Record<string, number>> {
  const db = getAdminDb();
  const snap = await db.collection("len_balances").get();
  const out: Record<string, number> = {};
  for (const d of snap.docs) {
    const b = d.data() as { coin?: string; balance?: number };
    if (!b.coin) continue;
    out[b.coin] = (out[b.coin] ?? 0) + (Number(b.balance) || 0);
  }
  return out;
}

/** Σ(credits − debits) por coin desde los asientos (verdad derivada). */
export async function entriesNetByCoin(): Promise<Record<string, number>> {
  const db = getAdminDb();
  const snap = await db.collection("len_ledger_entries").get();
  const out: Record<string, number> = {};
  for (const d of snap.docs) {
    const e = d.data() as { coin?: string; direction?: string; amount?: number };
    if (!e.coin) continue;
    const amt = Number(e.amount) || 0;
    out[e.coin] = (out[e.coin] ?? 0) + (e.direction === "credit" ? amt : -amt);
  }
  return out;
}

/** Reservas bancarias registradas por el operador (lo que el banco realmente tiene). */
export async function getReserves(): Promise<Record<string, number>> {
  const db = getAdminDb();
  const snap = await db.collection("len_system").doc("reserves").get();
  return snap.exists ? ((snap.data()?.by_coin as Record<string, number>) ?? {}) : {};
}

export async function setReserves(byCoin: Record<string, number>): Promise<void> {
  const db = getAdminDb();
  await db.collection("len_system").doc("reserves").set(
    { by_coin: byCoin, updated_at: new Date() }, { merge: true },
  );
}

/** Reconciliación completa: self-check del ledger + (si hay) vs reservas. */
export async function reconcile(): Promise<{ coins: CoinRecon[]; ok: boolean }> {
  const [supply, net, reserves] = await Promise.all([
    ledgerSupplyByCoin(), entriesNetByCoin(), getReserves(),
  ]);
  const coinSet = new Set<string>([...Object.keys(supply), ...Object.keys(net), ...Object.keys(reserves)]);
  const coins: CoinRecon[] = [];
  let allOk = true;

  for (const coin of coinSet) {
    const ledgerBalance = round2(supply[coin] ?? 0);
    const entriesNet    = round2(net[coin] ?? 0);
    const drift         = round2(ledgerBalance - entriesNet);
    const reserve       = coin in reserves ? round2(reserves[coin]) : null;
    const reserveDrift  = reserve != null ? round2(ledgerBalance - reserve) : null;
    const ok = Math.abs(drift) <= TOLERANCE && (reserveDrift == null || Math.abs(reserveDrift) <= TOLERANCE);
    if (!ok) allOk = false;
    coins.push({ coin, ledgerBalance, entriesNet, drift, reserve, reserveDrift, ok });
  }
  return { coins, ok: allOk };
}

// ── Freeze (congelar mint/burn ante descuadre) ────────────────────────────────

export interface FreezeState { frozen: boolean; reason?: string | null; since?: Date | null; }

export async function getFreeze(): Promise<FreezeState> {
  const db = getAdminDb();
  const snap = await db.collection("len_system").doc("freeze").get();
  if (!snap.exists) return { frozen: false };
  return snap.data() as FreezeState;
}

export async function isFrozen(): Promise<boolean> {
  return (await getFreeze()).frozen === true;
}

export async function setFreeze(frozen: boolean, reason?: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("len_system").doc("freeze").set(
    { frozen, reason: reason ?? null, since: frozen ? new Date() : null }, { merge: true },
  );
}
