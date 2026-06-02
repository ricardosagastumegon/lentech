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
  counterparty?:      string;      // user_id de la contraparte
  counterparty_name?: string;      // nombre mostrable de la contraparte
  created_at:   Date;
}

/** Una "pata" de un asiento múltiple (sin created_at). */
export type LedgerLeg = Omit<LedgerEntry, "created_at">;

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

/**
 * Publica VARIAS patas en UNA sola transacción atómica e idempotente.
 * O todas se aplican, o ninguna (no se puede destruir/duplicar valor a medias).
 * Idempotente: si todas las patas ya existen, no hace nada.
 * Lanza "INSUFFICIENT_FUNDS" si algún débito dejaría un saldo negativo.
 */
export async function postEntries(legs: LedgerLeg[]): Promise<void> {
  if (legs.length === 0) return;
  for (const l of legs) if (!(l.amount > 0)) throw new Error("amount debe ser positivo");

  const db = getAdminDb();
  const entryRefs = legs.map(l => db.collection(ENTRIES).doc(l.entry_id));
  const balKeys   = [...new Set(legs.map(l => balanceId(l.user_id, l.coin)))];
  const balRefs: Record<string, FirebaseFirestore.DocumentReference> = {};
  for (const l of legs) balRefs[balanceId(l.user_id, l.coin)] = db.collection(BALANCES).doc(balanceId(l.user_id, l.coin));

  await db.runTransaction(async (tx) => {
    // ── LECTURAS primero (requisito de Firestore) ──
    const entrySnaps = await Promise.all(entryRefs.map(r => tx.get(r)));
    if (entrySnaps.every(s => s.exists)) return; // idempotente: ya posteado

    const balEntries = await Promise.all(balKeys.map(async k => [k, await tx.get(balRefs[k])] as const));
    const balances: Record<string, number> = {};
    for (const [k, snap] of balEntries) balances[k] = snap.exists ? Number(snap.data()!.balance ?? 0) : 0;

    // ── Calcular + validar saldos ──
    legs.forEach((l, i) => {
      if (entrySnaps[i].exists) return; // pata ya posteada, no recalcular
      const k = balanceId(l.user_id, l.coin);
      balances[k] = round2(balances[k] + (l.direction === "credit" ? l.amount : -l.amount));
      if (balances[k] < 0) throw new Error("INSUFFICIENT_FUNDS");
    });

    // ── ESCRITURAS ──
    legs.forEach((l, i) => {
      if (entrySnaps[i].exists) return;
      tx.set(entryRefs[i], { ...l, amount: round2(l.amount), created_at: new Date() });
    });
    for (const k of balKeys) {
      const sep = k.lastIndexOf("__");
      const uid = k.slice(0, sep); const coin = k.slice(sep + 2);
      tx.set(balRefs[k], { user_id: uid, coin, balance: balances[k], updated_at: new Date() }, { merge: true });
    }
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

/** Normaliza created_at: Firestore lo devuelve como Timestamp, no como Date/ISO. */
function toJsDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export async function listEntries(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  // Sin índice compuesto: filtra por user_id y ordena en memoria.
  const snap = await db.collection(ENTRIES).where("user_id", "==", userId).get();
  return snap.docs
    .map(d => {
      const data = d.data() as LedgerEntry;
      return { ...data, created_at: toJsDate(data.created_at) };
    })
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}
