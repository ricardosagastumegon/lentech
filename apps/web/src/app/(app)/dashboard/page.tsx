'use client';

import { useEffect, useState } from 'react';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { RatesTicker } from '@/components/dashboard/RatesTicker';
import { KYCBanner } from '@/components/dashboard/KYCBanner';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore } from '@/store/wallet.store';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const authUser = useAuthStore.getState().user;
      const token    = useAuthStore.getState().accessToken;
      // Usuario real: saldo + historial SIEMPRE del ledger (no datos viejos del cache).
      if (authUser?.id?.startsWith('usr_') && token) {
        const { syncFromBackend } = await import('@/lib/wallet-sync');
        await syncFromBackend(token);
      }
      setLoading(false);
    })();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="pt-5 px-4">
        <p className="text-gray-400 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-black text-len-dark">
          {user?.firstName ?? 'Bienvenido'} 👋
        </h1>
      </div>

      {/* KYC Banner */}
      {user && user.kycLevel < 2 && (
        <div className="px-4">
          <KYCBanner kycLevel={user.kycLevel} kycStatus={user.kycStatus} />
        </div>
      )}

      {/* Balance */}
      <div className="px-4">
        <BalanceCard loading={loading} />
      </div>

      {/* Actions */}
      <div className="px-4">
        <QuickActions />
      </div>

      {/* FX Rates */}
      <div className="px-4">
        <RatesTicker />
      </div>

      {/* Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-len-dark">Movimientos recientes</h2>
          <a href="/transactions" className="text-len-purple text-sm font-semibold hover:underline">
            Ver todos →
          </a>
        </div>
        <RecentTransactions loading={loading} />
      </div>
    </div>
  );
}
