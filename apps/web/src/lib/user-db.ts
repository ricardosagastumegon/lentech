/**
 * LEN — Firebase Firestore user data sync
 *
 * Collection: len_demo_users/{userId}
 * Document:   { wallets, transactions, updatedAt }
 *
 * Used for cross-device demo persistence (desktop ↔ mobile).
 * Production will use wallet-service API instead.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import type { WalletBalance, Transaction } from '@/store/wallet.store';

const COLLECTION = 'len_demo_users';

export interface UserSnapshot {
  wallets:      WalletBalance[];
  transactions: Transaction[];
  updatedAt:    string;
}

/** Load wallet + transactions for a demo user. Returns null on error or not found. */
export async function loadUserSnapshot(userId: string): Promise<UserSnapshot | null> {
  try {
    const snap = await getDoc(doc(getDb(), COLLECTION, userId));
    if (!snap.exists()) return null;
    const data = snap.data() as UserSnapshot;
    if (!data.wallets?.length) return null;
    return data;
  } catch {
    // Firestore unavailable or rules block — fallback to demo defaults
    return null;
  }
}

/** Save wallet + transactions for a demo user. Fire-and-forget safe. */
export async function saveUserSnapshot(userId: string, snap: UserSnapshot): Promise<void> {
  try {
    await setDoc(doc(getDb(), COLLECTION, userId), snap);
  } catch {
    // Fail silently — localStorage is the local fallback
  }
}
