/**
 * LEN — Wallet ↔ Firestore sync service
 *
 * Two-way sync:
 *   1. Local changes → debounced save to Firestore (own document)
 *   2. Remote changes (incoming transfers from other users) → merge into local store
 *
 * Usage:
 *   startWalletSync('demo-gt')   // called after successful login
 *   stopWalletSync()              // called on logout
 */

import { useWalletStore } from '@/store/wallet.store';
import { saveUserSnapshot, subscribeToUserSnapshot } from './user-db';

let zustandUnsub:   (() => void) | null = null;
let firestoreUnsub: (() => void) | null = null;
let debounceTimer:  ReturnType<typeof setTimeout> | null = null;
let currentUserId:  string | null = null;
let isExternalUpdate = false; // prevent save-loop when applying remote changes

export function startWalletSync(userId: string): void {
  stopWalletSync();
  currentUserId = userId;

  // ── 1. Local → Firestore (debounced save) ────────────────────────────────
  zustandUnsub = useWalletStore.subscribe((state) => {
    if (!currentUserId || isExternalUpdate) return;
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

  // ── 2. Firestore → Local (real-time incoming transfers) ──────────────────
  firestoreUnsub = subscribeToUserSnapshot(userId, (remoteSnap) => {
    if (!currentUserId) return;

    // Only process external changes (updatedBy === 'system' means another user sent funds)
    if (remoteSnap.updatedBy === currentUserId) return;

    const localState  = useWalletStore.getState();
    const localTxIds  = new Set(localState.transactions.map(t => t.id));
    const newTxs      = (remoteSnap.transactions ?? []).filter(t => !localTxIds.has(t.id));

    if (newTxs.length === 0) return; // nothing new

    // Apply remote state — suppress the save-loop flag
    isExternalUpdate = true;
    useWalletStore.getState().setWallets(remoteSnap.wallets);
    useWalletStore.getState().setTransactions(remoteSnap.transactions);
    isExternalUpdate = false;
  });
}

export function stopWalletSync(): void {
  if (debounceTimer)  { clearTimeout(debounceTimer); debounceTimer = null; }
  if (zustandUnsub)   { zustandUnsub();   zustandUnsub   = null; }
  if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }
  currentUserId = null;
}
