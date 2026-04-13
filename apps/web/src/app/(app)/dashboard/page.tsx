'use client';

import { useEffect, useState } from 'react';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { RatesTicker } from '@/components/dashboard/rates-ticker';
import { KYCBanner } from '@/components/dashboard/kyc-banner';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore } from '@/store/wallet.store';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { setBalance, setTransactions } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, txRes] = await Promise.all([
          apiClient.get('/wallet/balance'),
          apiClient.get('/wallet/transactions?limit=5'),
        ]);
        setBalance(balanceRes.data);
        setTransactions(txRes.data.items);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="pt-6 px-4">
        <p className="text-gray-500 text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.firstName ?? `Cuenta ···${user?.phoneNumber?.slice(-4)}`}
        </h1>
      </div>

      {/* KYC Banner */}
      {user && user.kycLevel < 2 && (
        <div className="px-4">
          <KYCBanner kycLevel={user.kycLevel} kycStatus={user.kycStatus} />
        </div>
      )}

      {/* Balance Card */}
      <div className="px-4">
        <BalanceCard loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <QuickActions />
      </div>

      {/* FX Rates Ticker */}
      <div className="px-4">
        <RatesTicker />
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Movimientos recientes</h2>
          <a href="/transactions" className="text-mondega-green text-sm font-medium">Ver todos</a>
        </div>
        <RecentTransactions loading={loading} />
      </div>
    </div>
  );
}
