/**
 * Aplicación de límites por nivel KYC (cierra el gap C4 de la auditoría).
 *
 * Los límites (USD equiv) viven en KYC_LEVELS (identity.ts). Aquí se APLICAN:
 *   - `single`: tope por operación (todas las operaciones).
 *   - `daily` / `monthly`: tope acumulado de SALIDA (transfer + withdraw), sumando
 *      los débitos del usuario en la ventana desde el ledger.
 * Nivel con límite 0 = sin límite (ej. nivel 3 Empresarial).
 *
 * Montos en coin se convierten a USD equiv vía fx-engine (toUSD).
 */
import { KYC_LEVELS } from "@/lib/identity";
import { toUSD } from "@/lib/fx-engine";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CoinCode } from "@/store/wallet.store";

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: "single" | "daily" | "monthly"; limitUSD: number; attemptedUSD: number };

function toMillis(v: unknown): number {
  if (!v) return 0;
  const d = v as { toDate?: () => Date };
  if (typeof d.toDate === "function") return d.toDate().getTime();
  const t = new Date(v as string | number | Date).getTime();
  return isNaN(t) ? 0 : t;
}

/** Suma de SALIDAS (débitos del usuario, sin comisiones) en USD equiv: hoy y últimos 30 días. */
async function sumOutflowUSD(userId: string, sinceMs: number): Promise<{ dayUSD: number; monthUSD: number }> {
  const db = getAdminDb();
  const snap = await db.collection("len_ledger_entries").where("user_id", "==", userId).get();
  const dayStart = Date.now() - 24 * 3600 * 1000;
  let dayUSD = 0, monthUSD = 0;
  for (const doc of snap.docs) {
    const e = doc.data() as { direction?: string; amount?: number; coin?: CoinCode; type?: string; created_at?: unknown };
    if (e.direction !== "debit" || e.type === "fee") continue; // solo salidas reales del usuario
    const ms = toMillis(e.created_at);
    if (ms < sinceMs) continue;
    const usd = toUSD(Number(e.amount) || 0, (e.coin as CoinCode) ?? "DOLAR");
    monthUSD += usd;
    if (ms >= dayStart) dayUSD += usd;
  }
  return { dayUSD, monthUSD };
}

/**
 * Verifica los límites del nivel KYC del usuario.
 * `aggregate=true` (transfer/withdraw) además chequea acumulado diario/mensual.
 */
export async function checkLimits(opts: {
  userId: string; kycLevel?: number; coin: CoinCode; amount: number; aggregate: boolean;
}): Promise<LimitResult> {
  const lim = KYC_LEVELS[opts.kycLevel ?? 0] ?? KYC_LEVELS[0];
  const usd = toUSD(opts.amount, opts.coin);

  if (lim.single > 0 && usd > lim.single) {
    return { ok: false, reason: "single", limitUSD: lim.single, attemptedUSD: Math.round(usd * 100) / 100 };
  }
  if (opts.aggregate && (lim.daily > 0 || lim.monthly > 0)) {
    const monthStart = Date.now() - 30 * 24 * 3600 * 1000;
    const { dayUSD, monthUSD } = await sumOutflowUSD(opts.userId, monthStart);
    if (lim.daily > 0 && dayUSD + usd > lim.daily) {
      return { ok: false, reason: "daily", limitUSD: lim.daily, attemptedUSD: Math.round((dayUSD + usd) * 100) / 100 };
    }
    if (lim.monthly > 0 && monthUSD + usd > lim.monthly) {
      return { ok: false, reason: "monthly", limitUSD: lim.monthly, attemptedUSD: Math.round((monthUSD + usd) * 100) / 100 };
    }
  }
  return { ok: true };
}

export function limitMessage(r: Extract<LimitResult, { ok: false }>): string {
  const which = { single: "por operación", daily: "diario", monthly: "mensual" }[r.reason];
  return `Límite ${which} de tu nivel KYC superado (máx US$${r.limitUSD.toLocaleString()}). Verifica tu identidad para aumentarlo.`;
}
