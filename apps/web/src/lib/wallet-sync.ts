/**
 * LEN — Wallet ↔ Firestore sync service
 *
 * Two-way sync:
 *   1. Local changes → debounced save to Firestore (wallet + transactions + bank accounts)
 *   2. Remote changes (incoming transfers) → merge into local store
 *
 * Usage:
 *   await syncFromFirestore('demo-gt')  // load latest state from Firestore (page reload)
 *   startWalletSync('demo-gt')          // subscribe to local changes + remote changes
 *   stopWalletSync()                    // called on logout / unmount
 */

import { useWalletStore } from '@/store/wallet.store';
import { useBankStore } from '@/store/bank.store';
import { loadUserSnapshot, saveUserSnapshot, subscribeToUserSnapshot } from './user-db';

let walletUnsub:  (() => void) | null = null;
let bankUnsub:    (() => void) | null = null;
let firestoreUnsub: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let isExternalUpdate = false; // prevent save-loop when applying remote data

// ─── Save helper — always writes wallets + transactions + bank accounts ───────
function scheduleSave() {
  if (!currentUserId || isExternalUpdate) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!currentUserId) return;
    const { wallets, transactions } = useWalletStore.getState();
    const { accounts: bankAccounts } = useBankStore.getState();
    if (wallets.length > 0) {
      saveUserSnapshot(currentUserId, {
        wallets,
        transactions,
        bankAccounts,
        updatedAt: new Date().toISOString(),
      });
    }
  }, 1500);
}

/**
 * Load latest Firestore snapshot into local stores (wallets, transactions, bank accounts).
 * Sets isExternalUpdate=true so the write doesn't trigger a re-save.
 * Call this on page reload when the user is already authenticated.
 */
export async function syncFromFirestore(userId: string): Promise<void> {
  try {
    const snapshot = await loadUserSnapshot(userId);
    if (!snapshot?.wallets?.length) return;

    isExternalUpdate = true;
    useWalletStore.getState().setWallets(snapshot.wallets);
    useWalletStore.getState().setTransactions(snapshot.transactions);
    if (snapshot.bankAccounts?.length) {
      useBankStore.setState({ accounts: snapshot.bankAccounts });
    }
    isExternalUpdate = false;
  } catch {
    isExternalUpdate = false;
  }
}

/**
 * Carga saldo y transacciones desde el BACKEND autoritativo (ledger) para usuarios reales.
 * El cliente solo MUESTRA lo que el servidor dice — no calcula saldos.
 */
export async function syncFromBackend(token: string): Promise<boolean> {
  try {
    const [balRes, txRes] = await Promise.all([
      fetch('/api/wallet/balance',            { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/wallet/transactions?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!balRes.ok) return false;
    const bal = await balRes.json();
    const tx  = txRes.ok ? await txRes.json() : { data: { items: [] } };
    useWalletStore.getState().setWallets(bal?.data?.wallets ?? []);
    useWalletStore.getState().setTransactions(tx?.data?.items ?? []);
    return true;
  } catch {
    return false;
  }
}

export function startWalletSync(userId: string): void {
  stopWalletSync();
  currentUserId = userId;

  // ── 1. Local wallet changes → Firestore ─────────────────────────────────
  walletUnsub = useWalletStore.subscribe(() => scheduleSave());

  // ── 2. Local bank account changes → Firestore ────────────────────────────
  bankUnsub = useBankStore.subscribe(() => scheduleSave());

  // ── 3. Firestore → Local (real-time incoming transfers) ──────────────────
  firestoreUnsub = subscribeToUserSnapshot(userId, (remoteSnap) => {
    if (!currentUserId) return;

    // Only process changes made by other users/system (not our own saves)
    if (remoteSnap.updatedBy === currentUserId) return;

    const localState = useWalletStore.getState();
    const localTxIds = new Set(localState.transactions.map(t => t.id));
    const newTxs     = (remoteSnap.transactions ?? []).filter(t => !localTxIds.has(t.id));

    if (newTxs.length === 0) return; // nothing new

    isExternalUpdate = true;
    useWalletStore.getState().setWallets(remoteSnap.wallets);
    useWalletStore.getState().setTransactions(remoteSnap.transactions);
    isExternalUpdate = false;
  });
}

export function stopWalletSync(): void {
  if (debounceTimer)    { clearTimeout(debounceTimer); debounceTimer    = null; }
  if (walletUnsub)      { walletUnsub();   walletUnsub    = null; }
  if (bankUnsub)        { bankUnsub();     bankUnsub      = null; }
  if (firestoreUnsub)   { firestoreUnsub(); firestoreUnsub = null; }
  currentUserId = null;
}
