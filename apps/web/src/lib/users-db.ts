/**
 * Repositorio de usuarios LEN — Firestore.
 *
 * Colección: len_users
 * Doc ID:    user_id (UUID-like, ej. "usr_2024_carlos_gt")
 *
 * Diseño:
 *   - PIN hasheado con scrypt (NUNCA en plain)
 *   - phone único (índice secundario)
 *   - status: "active" | "suspended" | "deleted"
 *   - celo_address: wallet del usuario en Celo (opcional, agregar después de KYC)
 *   - conduit_customer_id: link al usuario en Conduit (opcional)
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { hashPassword, verifyPassword } from "@/lib/password";
import { randomBytes } from "crypto";

export type UserCountry = "MX" | "GT" | "HN";
export type UserStatus  = "active" | "suspended" | "deleted";
export type UserRole    = "user" | "admin";

export interface LenUser {
  user_id:             string;
  phone:               string;
  display_name:        string;
  country:             UserCountry;
  pin_hash:            string;        // NUNCA exponer en respuestas
  role:                UserRole;
  status:              UserStatus;
  celo_address?:       string;
  conduit_customer_id?: string;
  pomelo_user_id?:     string;
  kyc_level?:          number;          // 0=anónimo, 1=básico, 2=verificado, 3=empresarial
  kyc_status?:         string;          // none | in_review | approved | rejected
  created_at:          Date;
  updated_at:          Date;
  last_login_at?:      Date;
}

/** Datos del usuario seguros para devolver al cliente (sin pin_hash). */
export type PublicUser = Omit<LenUser, "pin_hash">;

const COLLECTION = "len_users";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateUserId(country: UserCountry): string {
  const random = randomBytes(8).toString("hex");
  return `usr_${country.toLowerCase()}_${random}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function toPublic(user: LenUser): PublicUser {
  const { pin_hash: _ignored, ...rest } = user;
  void _ignored;
  return rest;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getUserById(userId: string): Promise<LenUser | null> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Omit<LenUser, "user_id">;
  return { ...data, user_id: userId };
}

export async function getUserByPhone(phone: string): Promise<LenUser | null> {
  const db = getAdminDb();
  const normalized = normalizePhone(phone);
  const snap = await db.collection(COLLECTION)
    .where("phone", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...(doc.data() as Omit<LenUser, "user_id">), user_id: doc.id };
}

export async function listUsers(limit = 100): Promise<PublicUser[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(d => {
    const data = d.data() as Omit<LenUser, "user_id">;
    return toPublic({ ...data, user_id: d.id });
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  phone:               string;
  display_name:        string;
  country:             UserCountry;
  pin:                 string;          // plain, se hashea aquí
  celo_address?:       string;
  conduit_customer_id?: string;
  role?:               UserRole;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const phone = normalizePhone(input.phone);
  if (phone.length < 5) {
    throw new Error("Teléfono inválido (mínimo 5 dígitos)");
  }
  if (!input.display_name?.trim()) {
    throw new Error("display_name requerido");
  }
  if (!["MX", "GT", "HN"].includes(input.country)) {
    throw new Error("country debe ser MX, GT o HN");
  }
  if (!input.pin || input.pin.length < 6) {
    throw new Error("PIN debe ser de al menos 6 caracteres");
  }

  // Verificar que no existe phone duplicado
  const existing = await getUserByPhone(phone);
  if (existing) {
    throw new Error(`Ya existe un usuario con teléfono ${phone}`);
  }

  const userId = generateUserId(input.country);
  const now    = new Date();
  const user: LenUser = {
    user_id:             userId,
    phone,
    display_name:        input.display_name.trim(),
    country:             input.country,
    pin_hash:            hashPassword(input.pin),
    role:                input.role ?? "user",
    status:              "active",
    celo_address:        input.celo_address,
    conduit_customer_id: input.conduit_customer_id,
    created_at:          now,
    updated_at:          now,
  };

  const db = getAdminDb();
  // Save sin user_id (Firestore lo guarda como ID del doc)
  const { user_id: _unused, ...toSave } = user;
  void _unused;
  await db.collection(COLLECTION).doc(userId).set(toSave);

  return toPublic(user);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateUser(
  userId:  string,
  updates: Partial<Omit<LenUser, "user_id" | "pin_hash" | "created_at">>,
): Promise<PublicUser | null> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  if (updates.phone) updates.phone = normalizePhone(updates.phone);
  const merged = {
    ...snap.data(),
    ...updates,
    updated_at: new Date(),
  };

  await ref.update(merged);
  const updated = await getUserById(userId);
  return updated ? toPublic(updated) : null;
}

/** Cambia el PIN (re-hash). */
export async function updateUserPin(userId: string, newPin: string): Promise<boolean> {
  if (!newPin || newPin.length < 6) {
    throw new Error("PIN debe ser de al menos 6 caracteres");
  }
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({
    pin_hash:   hashPassword(newPin),
    updated_at: new Date(),
  });
  return true;
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function softDeleteUser(userId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({
    status:     "deleted",
    updated_at: new Date(),
  });
  return true;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Autentica un usuario por phone + PIN.
 * Retorna el user si las credenciales son correctas y el usuario está activo.
 */
export async function authenticateUser(
  phone: string,
  pin:   string,
): Promise<LenUser | null> {
  const user = await getUserByPhone(phone);
  if (!user) return null;
  if (user.status !== "active") return null;
  if (!verifyPassword(pin, user.pin_hash)) return null;

  // Update last_login (best-effort)
  try {
    const db = getAdminDb();
    await db.collection(COLLECTION).doc(user.user_id).update({
      last_login_at: new Date(),
    });
  } catch { /* non-blocking */ }

  return user;
}
