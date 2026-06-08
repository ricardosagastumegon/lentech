/**
 * Idempotencia ATÓMICA de webhooks (ataca C11: TOCTOU → doble mint).
 *
 * El patrón viejo get()→mint→set() NO es atómico: dos entregas concurrentes del
 * mismo evento pueden pasar ambas el check antes de escribir → doble mint.
 * Aquí se RESERVA el evento con create() (falla si ya existe) ANTES de mintear.
 *
 * Colección: len_processed_webhooks/{eventId}
 */
import { getAdminDb } from "@/lib/firebase-admin";

const COL = "len_processed_webhooks";

/** Reserva atómica. "reserved" = nuevo (procede); "duplicate" = ya visto (ignorar). */
export async function reserveWebhookEvent(
  eventId: string,
  meta: Record<string, unknown> = {},
): Promise<"reserved" | "duplicate"> {
  const db = getAdminDb();
  try {
    await db.collection(COL).doc(eventId).create({ status: "processing", reserved_at: new Date(), ...meta });
    return "reserved";
  } catch {
    return "duplicate"; // create() falla si el doc ya existe
  }
}

/** Marca el evento como procesado (tras mintear/quemar con éxito). */
export async function completeWebhookEvent(eventId: string, meta: Record<string, unknown> = {}): Promise<void> {
  const db = getAdminDb();
  await db.collection(COL).doc(eventId).set({ status: "done", processed_at: new Date(), ...meta }, { merge: true });
}

/** Libera la reserva si el procesamiento falló, para permitir un reintento legítimo. */
export async function releaseWebhookEvent(eventId: string): Promise<void> {
  const db = getAdminDb();
  try { await db.collection(COL).doc(eventId).delete(); } catch { /* noop */ }
}
