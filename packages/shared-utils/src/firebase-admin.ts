import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

/**
 * Initializes Firebase Admin SDK (singleton).
 * Reads credentials from env — supports both file path and base64 JSON.
 */
export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'lentech-216a0';

  let credential: admin.credential.Credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
    // Production: base64-encoded JSON stored as GitHub secret
    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
      'base64',
    ).toString('utf8');
    const serviceAccount = JSON.parse(json);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    // Development: path to downloaded JSON file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Fallback: Application Default Credentials (GCP / Cloud Run)
    credential = admin.credential.applicationDefault();
  }

  app = admin.initializeApp({ credential, projectId });
  return app;
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging();
}
