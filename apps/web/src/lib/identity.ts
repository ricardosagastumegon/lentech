/**
 * Módulo identity / KYC — LEN
 *
 * Responsable de: niveles KYC, captura/almacenamiento de documentos
 * (DPI, selfie, recibo de servicios), estado de verificación y gating de límites.
 *
 * Colecciones Firestore (vía Admin SDK):
 *   - len_kyc_documents/{userId__type}   → imagen (dataURL downscaled <1MB) + metadata
 *   - len_kyc_submissions/{userId}        → submission + estado de revisión
 *
 * NOTA (Fase 4): las imágenes deberían migrar a Firebase Storage (object storage);
 * por ahora se guardan como dataURL reducido en Firestore (1 doc por documento).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { getUserById, updateUser } from "@/lib/users-db";

export type KycStatus  = "none" | "in_review" | "approved" | "rejected";
export type KycDocType = "dpi_front" | "dpi_back" | "selfie" | "utility_bill";

export interface KycLevel {
  level:   number;
  name:    string;
  daily:   number;   // límite diario en USD equiv (0 = sin límite)
  monthly: number;
  single:  number;   // por transacción
}

/** Niveles KYC — fuente de verdad server-side (límites en USD equiv). */
export const KYC_LEVELS: KycLevel[] = [
  { level: 0, name: "Anónimo",     daily: 50,    monthly: 200,    single: 50    },
  { level: 1, name: "Básico",      daily: 200,   monthly: 1_000,  single: 200   },
  { level: 2, name: "Verificado",  daily: 2_000, monthly: 10_000, single: 2_000 },
  { level: 3, name: "Empresarial", daily: 0,     monthly: 0,      single: 0     },
];

/** Documentos requeridos para alcanzar nivel 2 (Verificado) — estándar bancario. */
export const REQUIRED_DOCS_VERIFIED: KycDocType[] = ["dpi_front", "dpi_back", "selfie", "utility_bill"];

export interface KycSubmission {
  user_id:         string;
  level_requested: number;
  documents:       KycDocType[];
  status:          KycStatus;
  submitted_at:    Date;
  reviewed_at?:    Date;
  reviewer_note?:  string | null;
}

const DOCS = "len_kyc_documents";
const SUBS = "len_kyc_submissions";

// Firestore limita 1MB por documento; validamos el dataURL reducido del cliente.
const MAX_DOC_BYTES = 900_000;

/** Guarda un documento KYC (dataURL ya reducido en el cliente). */
export async function storeKycDocument(userId: string, type: KycDocType, dataUrl: string): Promise<void> {
  if (Buffer.byteLength(dataUrl, "utf8") > MAX_DOC_BYTES) {
    throw new Error(`La imagen "${type}" es muy grande. Toma la foto de nuevo con menos resolución.`);
  }
  const db = getAdminDb();
  await db.collection(DOCS).doc(`${userId}__${type}`).set({
    user_id:     userId,
    type,
    data:        dataUrl,
    uploaded_at: new Date(),
  });
}

/**
 * Registra una submission KYC: guarda los documentos provistos y deja al usuario
 * en estado "in_review" (un operador aprueba en el panel admin).
 */
export async function submitKyc(
  userId: string,
  docs:   Partial<Record<KycDocType, string>>,
): Promise<KycSubmission> {
  const user = await getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  const provided = (Object.keys(docs) as KycDocType[]).filter(t => !!docs[t]);
  for (const type of provided) {
    await storeKycDocument(userId, type, docs[type] as string);
  }

  const submission: KycSubmission = {
    user_id:         userId,
    level_requested: 2,
    documents:       provided,
    status:          "in_review",
    submitted_at:    new Date(),
  };

  const db = getAdminDb();
  await db.collection(SUBS).doc(userId).set(submission);
  await updateUser(userId, { kyc_status: "in_review" });

  return submission;
}

/** Estado KYC actual del usuario + límites de su nivel. */
export async function getKycStatus(userId: string): Promise<{
  level: number; status: KycStatus; limits: KycLevel;
}> {
  const user   = await getUserById(userId);
  const level  = user?.kyc_level ?? 0;
  const status = (user?.kyc_status ?? "none") as KycStatus;
  return { level, status, limits: KYC_LEVELS[level] ?? KYC_LEVELS[0] };
}

/** Aprobación/rechazo por operador (panel admin). */
export async function reviewKyc(userId: string, approve: boolean, note?: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(SUBS).doc(userId).set({
    status:        approve ? "approved" : "rejected",
    reviewed_at:   new Date(),
    reviewer_note: note ?? null,
  }, { merge: true });

  await updateUser(userId, approve
    ? { kyc_level: 2, kyc_status: "approved" }
    : { kyc_status: "rejected" });
}

/** ¿El monto (USD equiv) está dentro del límite por transacción del nivel? */
export function withinSingleTxLimit(level: number, usdAmount: number): boolean {
  const l = KYC_LEVELS[level] ?? KYC_LEVELS[0];
  return l.single === 0 || usdAmount <= l.single;
}
