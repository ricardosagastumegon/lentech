/**
 * Módulo KYB (Know Your Business) — LEN
 *
 * Onboarding de EMPRESAS (caso import/export). Sin esto no se puede dar de alta
 * legalmente a un cliente comercial. Captura: datos de la empresa, documento de
 * constitución/patente, identificación tributaria (RFC/RTU/RTN), representante
 * legal y BENEFICIARIOS FINALES (UBO ≥25%). Aprobación → nivel 3 (Empresarial).
 *
 * Colecciones Firestore (Admin SDK):
 *   - len_kyb_documents/{userId__type}  → dataURL reducido (<900KB) + metadata
 *   - len_kyb_submissions/{userId}      → submission + UBOs + estado de revisión
 *
 * NOTA: imágenes como dataURL en Firestore (igual que KYC); migrar a object storage.
 * 🧑‍⚖️ La verificación real de identidad/UBO + screening de sanciones es pendiente
 *    (este módulo captura y deja en revisión; no sustituye un proveedor KYC/AML).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { getUserById, updateUser } from "@/lib/users-db";
import type { KycStatus } from "@/lib/identity";

export type KybDocType =
  | "company_registration"  // acta constitutiva / patente de comercio
  | "tax_id_doc"            // constancia tributaria (RFC/RTU/RTN)
  | "legal_rep_id"          // identificación del representante legal
  | "proof_of_address";     // domicilio fiscal

export interface Ubo {
  name:          string;
  doc_id:        string;    // identificación del beneficiario final
  ownership_pct: number;    // % de participación
}

export interface KybSubmission {
  user_id:           string;
  legal_name:        string;
  tax_id:            string;       // RFC (MX) / RTU (GT) / RTN (HN)
  business_activity: string;       // objeto social (import/export = mayor riesgo)
  expected_monthly_volume?: number;
  legal_rep:         { name: string; doc_id: string };
  ubos:              Ubo[];        // beneficiarios finales ≥25%
  documents:         KybDocType[];
  status:            KycStatus;
  submitted_at:      Date;
  reviewed_at?:      Date;
  reviewer_note?:    string | null;
}

const DOCS = "len_kyb_documents";
const SUBS = "len_kyb_submissions";
const MAX_DOC_BYTES = 900_000;
const UBO_THRESHOLD_PCT = 25;

export interface KybInput {
  legal_name:        string;
  tax_id:            string;
  business_activity: string;
  expected_monthly_volume?: number;
  legal_rep:         { name: string; doc_id: string };
  ubos:              Ubo[];
  documents:         Partial<Record<KybDocType, string>>;  // dataURLs
}

async function storeKybDocument(userId: string, type: KybDocType, dataUrl: string): Promise<void> {
  if (Buffer.byteLength(dataUrl, "utf8") > MAX_DOC_BYTES) {
    throw new Error(`El documento "${type}" es muy grande. Súbelo con menos resolución.`);
  }
  const db = getAdminDb();
  await db.collection(DOCS).doc(`${userId}__${type}`).set({
    user_id: userId, type, data: dataUrl, uploaded_at: new Date(),
  });
}

/** Registra una submission KYB y deja a la empresa en revisión. */
export async function submitKyb(userId: string, input: KybInput): Promise<KybSubmission> {
  const user = await getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  if (!input.legal_name?.trim()) throw new Error("Razón social requerida");
  if (!input.tax_id?.trim())      throw new Error("Identificación tributaria requerida (RFC/RTU/RTN)");
  if (!input.business_activity?.trim()) throw new Error("Objeto social / actividad requerida");
  if (!input.legal_rep?.name?.trim() || !input.legal_rep?.doc_id?.trim()) {
    throw new Error("Representante legal requerido (nombre y documento)");
  }
  if (!Array.isArray(input.ubos) || input.ubos.length === 0) {
    throw new Error("Debe declarar al menos un beneficiario final (UBO)");
  }
  for (const u of input.ubos) {
    if (!u.name?.trim() || !u.doc_id?.trim()) throw new Error("Cada UBO requiere nombre y documento");
    if (typeof u.ownership_pct !== "number" || u.ownership_pct <= 0 || u.ownership_pct > 100) {
      throw new Error("Participación de UBO inválida (0-100%)");
    }
  }
  // Al menos un UBO debe superar el umbral de control (≥25%).
  if (!input.ubos.some(u => u.ownership_pct >= UBO_THRESHOLD_PCT)) {
    throw new Error(`Debe declarar al menos un beneficiario final con ≥${UBO_THRESHOLD_PCT}% de participación`);
  }

  const provided = (Object.keys(input.documents) as KybDocType[]).filter(t => !!input.documents[t]);
  if (!provided.includes("company_registration")) throw new Error("Falta el documento de constitución/patente");
  if (!provided.includes("legal_rep_id"))         throw new Error("Falta la identificación del representante legal");
  for (const type of provided) {
    await storeKybDocument(userId, type, input.documents[type] as string);
  }

  const submission: KybSubmission = {
    user_id:           userId,
    legal_name:        input.legal_name.trim(),
    tax_id:            input.tax_id.trim(),
    business_activity: input.business_activity.trim(),
    expected_monthly_volume: input.expected_monthly_volume,
    legal_rep:         { name: input.legal_rep.name.trim(), doc_id: input.legal_rep.doc_id.trim() },
    ubos:              input.ubos.map(u => ({ name: u.name.trim(), doc_id: u.doc_id.trim(), ownership_pct: u.ownership_pct })),
    documents:         provided,
    status:            "in_review",
    submitted_at:      new Date(),
  };

  const db = getAdminDb();
  await db.collection(SUBS).doc(userId).set(submission);
  await updateUser(userId, { kyc_status: "in_review" });
  return submission;
}

/** Estado KYB actual de la empresa. */
export async function getKybStatus(userId: string): Promise<KybSubmission | null> {
  const db = getAdminDb();
  const snap = await db.collection(SUBS).doc(userId).get();
  return snap.exists ? (snap.data() as KybSubmission) : null;
}

/** Aprobación/rechazo por operador → nivel 3 (Empresarial) si aprueba. */
export async function reviewKyb(userId: string, approve: boolean, note?: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(SUBS).doc(userId).set({
    status:        approve ? "approved" : "rejected",
    reviewed_at:   new Date(),
    reviewer_note: note ?? null,
  }, { merge: true });

  await updateUser(userId, approve
    ? { kyc_level: 3, kyc_status: "approved" }   // Empresarial alcanzable
    : { kyc_status: "rejected" });
}
