/**
 * Firebase Admin SDK — solo para uso server-side (API routes, webhooks).
 * El Admin SDK bypasa las Firestore Security Rules usando la service account.
 * NUNCA importar esto desde componentes del cliente.
 *
 * Inicialización:
 *   Prioridad 1: variables de entorno individuales (Railway Secrets)
 *   Prioridad 2: archivo JSON local (desarrollo)
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Opción A: variables de entorno individuales (Railway / producción)
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
  }

  // Opción B: archivo service account local (desarrollo)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("../../../../firebase-service-account.json");
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
  } catch {
    throw new Error(
      "Firebase Admin: configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env.local, " +
      "o coloca firebase-service-account.json en la raíz del repo."
    );
  }
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}
