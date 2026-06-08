/**
 * Monitoreo AML (ataca C6: detección ≥US$10K + structuring).
 *
 * `screenTransaction` evalúa cada operación y, si dispara una regla, registra una
 * ALERTA (no bloquea — el bloqueo es decisión de cumplimiento/operador). Base para
 * el reporte a UIF/IVE-SIB (el envío formal lo define el oficial de cumplimiento 🧑‍⚖️).
 *
 * Reglas:
 *   - threshold:    una operación ≥ US$10,000 equiv.
 *   - structuring:  varias operaciones bajo el umbral que suman sospechoso en 24h.
 *
 * Colección: len_aml_alerts/{id}
 */
import { getAdminDb } from "@/lib/firebase-admin";
import { toUSD } from "@/lib/fx-engine";
import type { CoinCode } from "@/store/wallet.store";

const REPORT_THRESHOLD_USD   = 10_000;
const STRUCTURING_WINDOW_MS  = 24 * 3600 * 1000;
const STRUCTURING_MIN_USD    = 9_000;   // acumulado sospechoso justo bajo el umbral
const STRUCTURING_MIN_COUNT  = 3;       // nº de operaciones fraccionadas

const COL = "len_aml_alerts";
const round2 = (n: number) => Math.round(n * 100) / 100;

function toMillis(v: unknown): number {
  if (!v) return 0;
  const d = v as { toDate?: () => Date };
  if (typeof d.toDate === "function") return d.toDate().getTime();
  const t = new Date(v as string | number | Date).getTime();
  return isNaN(t) ? 0 : t;
}

export type AmlReason = "threshold" | "structuring";

export interface AmlAlert {
  id: string; user_id: string; reason: AmlReason; coin: string;
  amountUSD: number; aggregateUSD?: number; count?: number; ref?: string | null;
  type?: string; created_at: Date;
}

/** Evalúa una operación y registra alerta si corresponde. Nunca lanza (no rompe el flujo). */
export async function screenTransaction(opts: {
  userId: string; coin: CoinCode; amount: number; ref?: string; type: string;
}): Promise<void> {
  try {
    const db  = getAdminDb();
    const usd = toUSD(opts.amount, opts.coin);
    const now = new Date();

    if (usd >= REPORT_THRESHOLD_USD) {
      const id = `${opts.ref ?? `${opts.userId}_${Date.now()}`}__threshold`;
      await db.collection(COL).doc(id).set({
        id, user_id: opts.userId, reason: "threshold", coin: opts.coin,
        amountUSD: round2(usd), ref: opts.ref ?? null, type: opts.type, created_at: now,
      });
      return;
    }

    // Structuring: acumulado de salidas (débitos) en 24h
    const sinceMs = Date.now() - STRUCTURING_WINDOW_MS;
    const snap = await db.collection("len_ledger_entries").where("user_id", "==", opts.userId).get();
    let aggUSD = usd, count = 1;
    for (const d of snap.docs) {
      const e = d.data() as { direction?: string; type?: string; amount?: number; coin?: CoinCode; created_at?: unknown };
      if (e.direction !== "debit" || e.type === "fee") continue;
      if (toMillis(e.created_at) < sinceMs) continue;
      aggUSD += toUSD(Number(e.amount) || 0, (e.coin as CoinCode) ?? "DOLAR");
      count++;
    }
    if (count >= STRUCTURING_MIN_COUNT && aggUSD >= STRUCTURING_MIN_USD) {
      const id = `${opts.userId}__structuring_${now.toISOString().slice(0, 10)}`;
      await db.collection(COL).doc(id).set({
        id, user_id: opts.userId, reason: "structuring", coin: opts.coin,
        amountUSD: round2(usd), aggregateUSD: round2(aggUSD), count,
        ref: opts.ref ?? null, type: opts.type, created_at: now,
      }, { merge: true });
    }
  } catch (e) {
    console.error("[aml] screenTransaction error (no bloqueante):", e);
  }
}

export async function listAmlAlerts(limit = 100): Promise<AmlAlert[]> {
  const db = getAdminDb();
  const snap = await db.collection(COL).orderBy("created_at", "desc").limit(limit).get();
  return snap.docs.map(d => d.data() as AmlAlert);
}
