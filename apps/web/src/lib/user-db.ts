/**
 * LEN — Firebase Firestore user data sync
 *
 * Collection: len_demo_users/{userId}
 * Document:   { wallets, transactions, updatedAt, updatedBy }
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDb } from './firebase';
import type { WalletBalance, Transaction, CoinCode } from '@/store/wallet.store';
import type { BankAccount } from '@/store/bank.store';

const COLLECTION = 'len_demo_users';

export interface UserSnapshot {
  wallets:       WalletBalance[];
  transactions:  Transaction[];
  bankAccounts?: BankAccount[];
  updatedAt:     string;
  updatedBy?:    string; // 'system' = external credit from another user
}

export async function loadUserSnapshot(userId: string): Promise<UserSnapshot | null> {
  try {
    const snap = await getDoc(doc(getDb(), COLLECTION, userId));
    if (!snap.exists()) return null;
    const data = snap.data() as UserSnapshot;
    if (!data.wallets?.length) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveUserSnapshot(userId: string, snap: UserSnapshot): Promise<void> {
  try {
    await setDoc(doc(getDb(), COLLECTION, userId), { ...snap, updatedBy: userId });
  } catch {
    // fail silently
  }
}

/**
 * Credit a received transfer to recipient's Firestore account.
 * Called by sender — recipient sees it instantly via real-time listener.
 */
export async function creditTransfer(params: {
  recipientId:  string;
  coin:         CoinCode;
  fiatCurrency: string;
  amount:       number;
  transaction:  Transaction;
}): Promise<void> {
  try {
    const ref  = doc(getDb(), COLLECTION, params.recipientId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // First time — create document
      await setDoc(ref, {
        wallets: [{
          coin:         params.coin,
          balance:      params.amount.toFixed(2),
          available:    params.amount.toFixed(2),
          fiatBalance:  '0',
          fiatCurrency: params.fiatCurrency,
          balanceUSD:   0,
        }],
        transactions: [params.transaction],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      } as UserSnapshot);
      return;
    }

    const data     = snap.data() as UserSnapshot;
    const wallets  = (data.wallets ?? []).map(w => ({ ...w }));
    const idx      = wallets.findIndex(w => w.coin === params.coin);

    if (idx >= 0) {
      wallets[idx] = {
        ...wallets[idx],
        balance:   (parseFloat(wallets[idx].balance  || '0') + params.amount).toFixed(2),
        available: (parseFloat(wallets[idx].available || '0') + params.amount).toFixed(2),
      };
    } else {
      wallets.push({
        coin: params.coin, balance: params.amount.toFixed(2),
        available: params.amount.toFixed(2), fiatBalance: '0',
        fiatCurrency: params.fiatCurrency, balanceUSD: 0,
      });
    }

    const existing     = data.transactions ?? [];
    const isDupe       = existing.some(t => t.id === params.transaction.id);
    const transactions = isDupe
      ? existing
      : [params.transaction, ...existing].slice(0, 60);

    await setDoc(ref, {
      wallets, transactions,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    });
  } catch (e) {
    console.warn('[LEN] creditTransfer failed:', e);
  }
}

/**
 * Real-time Firestore listener — fires callback when ANY external change arrives.
 * Returns unsubscribe function.
 */
export function subscribeToUserSnapshot(
  userId:   string,
  callback: (snap: UserSnapshot) => void,
): () => void {
  try {
    const ref = doc(getDb(), COLLECTION, userId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as UserSnapshot;
        if (data?.wallets?.length) callback(data);
      },
      () => {},
    );
  } catch {
    return () => {};
  }
}
