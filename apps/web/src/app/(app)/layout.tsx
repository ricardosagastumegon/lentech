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
