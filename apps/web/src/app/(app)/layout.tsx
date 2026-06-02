'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopBar } from '@/components/layout/top-bar';
import { useAuthStore } from '@/store/auth.store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  // Wait for Zustand persist to rehydrate from localStorage before checking auth.
  // Without this, isAuthenticated is always false on first render → redirect loop.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated, router]);

  // ── Firestore sync on every authenticated session (page reload, new device) ──
  // Without this, wallet/tx/bank changes made in a previous session are NOT loaded
  // after a page reload — because startWalletSync is only called on explicit login.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const user = useAuthStore.getState().user;
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      const sync = await import('@/lib/wallet-sync');
      if (cancelled) return;

      // Usuario REAL (usr_*): saldo/tx desde el backend autoritativo (ledger).
      if (user.id.startsWith('usr_')) {
        const token = useAuthStore.getState().accessToken;
        if (token) await sync.syncFromBackend(token);
        return;
      }

      // Usuario DEMO (demo-*): sync con Firestore demo (cross-device) — sin cambios.
      await sync.syncFromFirestore(user.id);
      if (cancelled) return;
      sync.startWalletSync(user.id);
    })();

    return () => {
      cancelled = true;
      import('@/lib/wallet-sync').then(({ stopWalletSync }) => stopWalletSync());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated]);

  // Show nothing while rehydrating — prevents flash and false redirect
  if (!hydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-len-surface">
      <TopBar />
      <main className="pt-16 pb-20 max-w-2xl mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
