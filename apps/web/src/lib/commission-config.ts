/**
 * Configuración dinámica de comisiones — leído desde Firestore.
 *
 * Colección: len_commission_config
 * Doc ID:    {operation}_{country}  ej. "deposit_GT", "withdrawal_MX"
 *
 * Cada regla tiene:
 *   - fee_percent:  % aplicado al monto (default 1.5)
 *   - fee_min:      comisión mínima en la moneda local
 *   - fee_max:      comisión máxima (0 = sin tope)
 *   - splits:       array de beneficiarios (cada uno con % de la comisión)
 *
 * Los splits permiten repartir la comisión entre múltiples wallets
 * (treasury, partners, referidos, etc.) — la suma debe ser 100.
 */

import { getAdminDb } from "@/lib/firebase-admin";

export type CommissionOperation =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "card_spend";

export type CommissionCountry = "MX" | "GT" | "HN";

export interface CommissionSplit {
  recipient_id: string;          // ej. "len_treasury", "banrural_partner"
  name:         string;          // human-readable
  percent:      number;          // % de la comisión total (suma debe ser 100)
  wallet_celo:  string;          // address Celo donde reciben los tokens
  active:       boolean;
}

export interface CommissionRule {
  rule_id:           string;     // ej. "deposit_GT"
  operation:         CommissionOperation;
  country:           CommissionCountry;
  fee_percent:       number;     // % aplicado al monto bruto (ej. 1.5)
  fee_min:           number;     // mínimo en moneda local (ej. 1.00)
  fee_max:           number;     // máximo (0 = sin tope)
  splits:            CommissionSplit[];
  active:            boolean;
  updated_at?:       Date;
  updated_by?:       string;
}

const COLLECTION = "len_commission_config";

/**
 * Reglas por defecto al iniciar el sistema.
 * Comisión 1.5% en todos los flujos, 100% a treasury.
 */
const DEFAULT_RULES: CommissionRule[] = [
  // ── Deposit (entrada de fiat → mint token) ──
  {
    rule_id:     "deposit_GT",
    operation:   "deposit",
    country:     "GT",
    fee_percent: 1.5,
    fee_min:     1.00,
    fee_max:     0,
    splits: [
      { recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true },
    ],
    active: true,
  },
  {
    rule_id:     "deposit_MX",
    operation:   "deposit",
    country:     "MX",
    fee_percent: 1.5,
    fee_min:     5.00,
    fee_max:     0,
    splits: [
      { recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true },
    ],
    active: true,
  },
  {
    rule_id:     "deposit_HN",
    operation:   "deposit",
    country:     "HN",
    fee_percent: 1.5,
    fee_min:     5.00,
    fee_max:     0,
    splits: [
      { recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true },
    ],
    active: true,
  },
  // ── Withdrawal (burn token → salida de fiat) ──
  {
    rule_id:     "withdrawal_GT",
    operation:   "withdrawal",
    country:     "GT",
    fee_percent: 1.5,
    fee_min:     1.00,
    fee_max:     0,
    splits: [{ recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true }],
    active: true,
  },
  {
    rule_id:     "withdrawal_MX",
    operation:   "withdrawal",
    country:     "MX",
    fee_percent: 1.5,
    fee_min:     5.00,
    fee_max:     0,
    splits: [{ recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true }],
    active: true,
  },
  {
    rule_id:     "withdrawal_HN",
    operation:   "withdrawal",
    country:     "HN",
    fee_percent: 1.5,
    fee_min:     5.00,
    fee_max:     0,
    splits: [{ recipient_id: "len_treasury", name: "LEN Treasury", percent: 100, wallet_celo: "", active: true }],
    active: true,
  },
];

// ── Read ──────────────────────────────────────────────────────────────────────

/** Lee la regla aplicable. Si no existe, retorna default y la guarda. */
export async function getCommissionRule(
  operation: CommissionOperation,
  country:   CommissionCountry,
): Promise<CommissionRule> {
  const db    = getAdminDb();
  const docId = `${operation}_${country}`;
  const ref   = db.collection(COLLECTION).doc(docId);
  const snap  = await ref.get();

  if (snap.exists) {
    return snap.data() as CommissionRule;
  }

  // Si no existe, crearla con el default y devolverla
  const defaultRule = DEFAULT_RULES.find(r => r.rule_id === docId);
  if (!defaultRule) {
    throw new Error(`No commission rule found for ${docId} and no default available`);
  }
  await ref.set({ ...defaultRule, updated_at: new Date() });
  return defaultRule;
}

/** Lista todas las reglas. */
export async function listCommissionRules(): Promise<CommissionRule[]> {
  const db   = getAdminDb();
  const snap = await db.collection(COLLECTION).get();
  if (snap.empty) {
    // Seed defaults si está vacío
    const batch = db.batch();
    for (const rule of DEFAULT_RULES) {
      batch.set(db.collection(COLLECTION).doc(rule.rule_id), {
        ...rule,
        updated_at: new Date(),
      });
    }
    await batch.commit();
    return DEFAULT_RULES;
  }
  return snap.docs.map(d => d.data() as CommissionRule);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/** Actualiza una regla. Valida que los splits sumen 100. */
export async function updateCommissionRule(
  ruleId:  string,
  updates: Partial<Omit<CommissionRule, "rule_id">>,
  adminUser: string,
): Promise<CommissionRule> {
  const db  = getAdminDb();
  const ref = db.collection(COLLECTION).doc(ruleId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Rule ${ruleId} not found`);

  // Validar splits si vienen en updates
  if (updates.splits) {
    const total = updates.splits.reduce((s, sp) => s + (sp.active ? sp.percent : 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`Splits activos deben sumar 100% (suma actual: ${total})`);
    }
  }

  const merged = {
    ...snap.data(),
    ...updates,
    rule_id:    ruleId,
    updated_at: new Date(),
    updated_by: adminUser,
  } as CommissionRule;

  await ref.set(merged);
  return merged;
}

// ── Cálculo ───────────────────────────────────────────────────────────────────

export interface CommissionCalculation {
  gross_amount:     number;
  fee_amount:       number;
  net_amount:       number;
  fee_percent_used: number;
  split_breakdown:  Array<{
    recipient_id: string;
    name:         string;
    amount:       number;
    wallet_celo:  string;
  }>;
}

/**
 * Calcula comisión total y desglose por beneficiario para un monto bruto.
 * Aplica fee_min y fee_max si están configurados.
 */
export function calculateCommission(
  rule:        CommissionRule,
  grossAmount: number,
): CommissionCalculation {
  let feeAmount = grossAmount * (rule.fee_percent / 100);

  if (rule.fee_min > 0 && feeAmount < rule.fee_min) feeAmount = rule.fee_min;
  if (rule.fee_max > 0 && feeAmount > rule.fee_max) feeAmount = rule.fee_max;

  // Redondear a 2 decimales
  feeAmount = Math.round(feeAmount * 100) / 100;
  const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;

  const activeSplits = rule.splits.filter(s => s.active);
  const splitBreakdown = activeSplits.map(s => ({
    recipient_id: s.recipient_id,
    name:         s.name,
    amount:       Math.round((feeAmount * s.percent / 100) * 100) / 100,
    wallet_celo:  s.wallet_celo,
  }));

  return {
    gross_amount:     grossAmount,
    fee_amount:       feeAmount,
    net_amount:       netAmount,
    fee_percent_used: rule.fee_percent,
    split_breakdown:  splitBreakdown,
  };
}
