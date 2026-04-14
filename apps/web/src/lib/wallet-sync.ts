/**
 * LEN — Wallet → Firestore sync service
 *
 * Subscribes to Zustand wallet store changes and debounce-saves
 * to Firestore so the user's data is available on any device.
 *
 * Usage:
 *   startWalletSync('demo-gt')   // called after successful login
 *   stopWalletSync()              // called on logout
 */

import { useWalletStore } from '@/store/wallet.store';
import { saveUserSnapshot } from './user-db';

let unsubscribe: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;

export function startWalletSync(userId: string): void {
  // Stop any existing subscription first
  stopWalletSync();
  currentUserId = userId;

  unsubscribe = useWalletStore.subscribe((state) => {
    if (!currentUserId) return;
    // Debounce: only save after 1.5s of inactivity to avoid hammering Firestore
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (currentUserId && state.wallets.length > 0) {
        saveUserSnapshot(currentUserId, {
          wallets:      state.wallets,
          transactions: state.transactions,
          updatedAt:    new Date().toISOString(),
        });
      }
    }, 1500);
  });
}

export function stopWalletSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentUserId = null;
}
