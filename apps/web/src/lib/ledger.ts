/**
 * Módulo ledger — LEN  ·  FUENTE DE VERDAD de los saldos.
 *
 * Doble entrada inmutable en Firestore. El saldo del usuario NO es un campo
 * editable: se deriva de los asientos. Se mantiene un doc de balance como caché,
 * actualizado de forma ATÓMICA (transacción Firestore) e IDEMPOTENTE (por entry_id)
 * junto con cada asiento — imposible doble crédito/débito por el mismo evento.
 *
 * Colecciones:
 *   - len_ledger_entries/{entry_id}        → asiento inmutable
 *   - len_balances/{user_id__coin}         → saldo cacheado (derivado)
 *
 * Invariante 1:1: la suma de saldos por coin debe == supply on-chain == reservas banco.
 */

import { getAdminDb } from "@/lib/firebase-admin";

export type LedgerDirection = "credit" | "debit";
export type LedgerEntryType =
  | "deposit" | "withdraw" | "transfer_in" | "transfer_out"
  | "fee" | "fx_in" | "fx_out" | "adjustment";

export interface LedgerEntry {
  entry_id:     string;            // único — sirve de idempotency key
  user_id:      string;
  coin:         string;            // QUETZA | MEXCOIN | LEMPI
  direction:    LedgerDirection;
  amount:       number;            // positivo, 2 decimales
  type:         LedgerEntryType;
  ref?:         string;            // referencia externa (webhook id, tx hash)
  description?: string;
  counterparty?: string;
  created_at:   Date;
}

const ENTRIES  = "len_ledger_entries";
const BALANCES = "len_balances";

const round2 = (n: number) => Math.round(n * 100) / 100;
const balanceId = (userId: string, coin: string) => `${userId}__${coin}`;

/**
 * Publica un asiento + actualiza el saldo de forma atómica e idempotente.
 * Si ya existe un asiento con ese entry_id, no hace nada (devuelve posted=false).
 * Lanza si un débito dejaría el saldo negativo.
 */
export async function postEntry(
  e: Omit<LedgerEntry, "created_at">,
): Promise<{ posted: boolean; balance: number }> {
  if (!(e.amount > 0)) throw new Error("amount debe ser positivo");
  const db       = getAdminDb();
  const entryRef = db.collection(ENTRIES).doc(e.entry_id);
  const balRef   = db.collection(BALANCES).doc(balanceId(e.user_id, e.coin));

  return db.runTransaction(async (tx) => {
    const [entrySnap, balSnap] = await Promise.all([tx.get(entryRef), tx.get(balRef)]);
    const current = balSnap.exists ? Number(balSnap.data()!.balance ?? 0) : 0;

    if (entrySnap.exists) return { posted: false, balance: current }; // idempotente

    const delta = e.direction === "credit" ? e.amount : -e.amount;
    const next  = round2(current + delta);
    if (next < 0) throw new Error("Saldo insuficiente");

    tx.set(entryRef, { ...e, amount: round2(e.amount), created_at: new Date() });
    tx.set(balRef, { user_id: e.user_id, coin: e.coin, balance: next, updated_at: new Date() }, { merge: true });
    return { posted: true, balance: next };
  });
}

/** Movimiento interno entre dos usuarios (transfer P2P) — dos asientos atómicos. */
export async function postTransfer(params: {
  ref: string; coin: string; amount: number;
  from: string; to: string; description?: string;
}): Promise<void> {
  await postEntry({
    entry_id: `${params.ref}__out`, user_id: params.from, coin: params.coin,
    direction: "debit", amount: params.amount, type: "transfer_out",
    ref: params.ref, counterparty: params.to, description: params.description,
  });
  await postEntry({
    entry_id: `${params.ref}__in`, user_id: params.to, coin: params.coin,
    direction: "credit", amount: params.amount, type: "transfer_in",
    ref: params.ref, counterparty: params.from, description: params.description,
  });
}

export async function getBalance(userId: string, coin: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection(BALANCES).doc(balanceId(userId, coin)).get();
  return snap.exists ? Number(snap.data()!.balance ?? 0) : 0;
}

export async function getBalances(userId: string): Promise<{ coin: string; balance: number }[]> {
  const db = getAdminDb();
  const snap = await db.collection(BALANCES).where("user_id", "==", userId).get();
  return snap.docs.map(d => ({ coin: String(d.data().coin), balance: Number(d.data().balance ?? 0) }));
}

export async function listEntries(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  // Sin índice compuesto: filtra por user_id y ordena en memoria.
  const snap = await db.collection(ENTRIES).where("user_id", "==", userId).get();
  return snap.docs
    .map(d => d.data() as LedgerEntry)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
