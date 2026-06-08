/**
 * Saga de retiro (ataca C2: "quema antes de pagar, sin rollback").
 *
 * Cada retiro queda como una OBLIGACIÓN rastreable:
 *   pending_payout → settled            (el banco confirmó el pago fiat)
 *                  → failed_compensated  (el pago falló → se REVIERTE el débito en el ledger)
 *
 * Así, si el pago fiat (SPEI/ACH) nunca sale, el saldo del usuario se re-acredita
 * automáticamente (compensación), en vez de evaporarse. Reverso idempotente por entry_id.
 *
 * Colección: len_withdrawals/{ref}
 */
import { getAdminDb } from "@/lib/firebase-admin";
import { postEntries, type LedgerLeg } from "@/lib/ledger";

export type WithdrawalStatus = "pending_payout" | "settled" | "failed_compensated";

export interface WithdrawalSplit { recipient_id: string; amount: number; name?: string }

export interface WithdrawalRecord {
  ref:         string;
  user_id:     string;
  coin:        string;
  gross:       number;
  fee:         number;
  net:         number;
  splits:      WithdrawalSplit[];   // para poder revertir las comisiones
  destination: string;
  status:      WithdrawalStatus;
  created_at:  Date;
  updated_at:  Date;
}

const COL = "len_withdrawals";

/** Registra el retiro como pendiente de pago (tras el débito en el ledger). */
export async function recordWithdrawal(
  w: Omit<WithdrawalRecord, "status" | "created_at" | "updated_at">,
): Promise<void> {
  const db  = getAdminDb();
  const now = new Date();
  await db.collection(COL).doc(w.ref).set({
    ...w, status: "pending_payout", created_at: now, updated_at: now,
  });
}

export async function listWithdrawals(status?: WithdrawalStatus, limit = 100): Promise<WithdrawalRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection(COL).orderBy("created_at", "desc").limit(limit).get();
  const all = snap.docs.map(d => d.data() as WithdrawalRecord);
  return status ? all.filter(w => w.status === status) : all;
}

/** El banco confirmó el pago fiat → retiro liquidado. */
export async function settleWithdrawal(ref: string): Promise<boolean> {
  const db   = getAdminDb();
  const doc  = db.collection(COL).doc(ref);
  const snap = await doc.get();
  if (!snap.exists || (snap.data() as WithdrawalRecord).status !== "pending_payout") return false;
  await doc.update({ status: "settled", updated_at: new Date() });
  return true;
}

/**
 * El pago fiat falló → COMPENSAR: re-acreditar el bruto al usuario y revertir las
 * comisiones. Idempotente (entry_id derivado del ref). El usuario no pierde fondos.
 */
export async function failWithdrawal(ref: string): Promise<boolean> {
  const db   = getAdminDb();
  const doc  = db.collection(COL).doc(ref);
  const snap = await doc.get();
  if (!snap.exists) return false;
  const w = snap.data() as WithdrawalRecord;
  if (w.status !== "pending_payout") return false;

  const legs: LedgerLeg[] = [
    {
      entry_id: `${ref}__comp_user`, user_id: w.user_id, coin: w.coin,
      direction: "credit", amount: w.gross, type: "withdraw_reversal", ref,
      description: "Reverso de retiro (pago fiat falló)",
    },
  ];
  (w.splits ?? []).forEach((s, i) => {
    if (s.amount > 0) legs.push({
      entry_id: `${ref}__comp_fee_${i}`, user_id: s.recipient_id, coin: w.coin,
      direction: "debit", amount: s.amount, type: "fee_reversal", ref,
      description: "Reverso comisión retiro", counterparty: w.user_id,
    });
  });

  await postEntries(legs);
  await doc.update({ status: "failed_compensated", updated_at: new Date() });
  return true;
}
