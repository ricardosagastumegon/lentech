'use client';

import { useState } from 'react';
import { useWalletStore } from '@/store/wallet.store';

export function BalanceCard({ loading }: { loading: boolean }) {
  const [hidden, setHidden] = useState(false);
  const balance = useWalletStore((s) => s.balance);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-mondega-green to-green-700 rounded-2xl p-6 text-white shadow-lg animate-pulse">
        <div className="h-4 bg-white/20 rounded w-24 mb-4" />
        <div className="h-10 bg-white/20 rounded w-40 mb-2" />
        <div className="h-3 bg-white/20 rounded w-28" />
      </div>
    );
  }

  const mondg = balance ? Number(balance.availableMondg) : 0;
  const currencies = balance?.balanceInCurrencies ?? {};

  return (
    <div className="bg-gradient-to-br from-mondega-green to-green-700 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <span className="text-green-200 text-sm font-medium">Balance disponible</span>
        <button
          onClick={() => setHidden((h) => !h)}
          className="text-green-200 hover:text-white transition-colors text-xs"
        >
          {hidden ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold tracking-tight">
          {hidden ? '••••••' : `${mondg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MONDG`}
        </div>
        {Object.keys(currencies).length > 0 && (
          <div className="text-green-200 text-sm mt-1">
            {hidden
              ? '••••'
              : Object.entries(currencies)
                  .map(([k, v]) => `≈ ${Number(v).toLocaleString()} ${k}`)
                  .join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
