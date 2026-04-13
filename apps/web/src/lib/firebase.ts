import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Project: lentech-216a0
// Fill remaining values from: Firebase Console → Configuración → Aplicaciones → Web
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? 'AIzaSyCNHgU4WyhsaixGvfX9lj0gBGJFxg5aynU',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'lentech-216a0.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? 'lentech-216a0',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'lentech-216a0.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1093466431411',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '1:1093466431411:web:359cbbc32bc49b07f4f5c6',
};

let firebaseApp: FirebaseApp;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];
  }
  return firebaseApp;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(getFirebaseApp());
    return messaging;
  } catch {
    return null;
  }
}

/**
 * Request push notification permission and return FCM token.
 * Call this after user logs in and grants permission.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const { getToken } = await import('firebase/messaging');
  const msg = await getFirebaseMessaging();
  if (!msg) return null;

  const token = await getToken(msg, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  return token ?? null;
}
