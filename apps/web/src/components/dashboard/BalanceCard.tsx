'use client';

import { useState } from 'react';
import { useWalletStore, COINS } from '@/store/wallet.store';
import { useAuthStore } from '@/store/auth.store';

export function BalanceCard({ loading }: { loading: boolean }) {
  const [hidden, setHidden] = useState(false);
  const wallets = useWalletStore((s) => s.wallets);
  const { user } = useAuthStore();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 text-white shadow-lg animate-pulse">
        <div className="h-4 bg-white/20 rounded w-24 mb-4" />
        <div className="h-10 bg-white/20 rounded w-40 mb-2" />
        <div className="h-3 bg-white/20 rounded w-28" />
      </div>
    );
  }

  const totalUSD = wallets.reduce((sum, w) => sum + w.balanceUSD, 0);
  const primaryWallet = wallets[0];
  const coinMeta = primaryWallet ? COINS[primaryWallet.coin] : null;

  return (
    <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {coinMeta && <span className="text-2xl">{coinMeta.flag}</span>}
          <span className="text-green-200 text-sm font-medium">
            {coinMeta?.name ?? 'Mi billetera'}
          </span>
        </div>
        <button
          onClick={() => setHidden((h) => !h)}
          className="text-green-200 hover:text-white transition-colors text-xs"
        >
          {hidden ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>

      {primaryWallet ? (
        <>
          <div className="mb-2">
            <div className="text-4xl font-bold tracking-tight">
              {hidden
                ? '••••••'
                : `${Number(primaryWallet.available).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <div className="text-green-200 text-lg font-semibold">{primaryWallet.coin}</div>
          </div>
          <div className="text-green-300 text-sm">
            {hidden ? '≈ $••••' : `≈ $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="text-3xl font-bold mb-1">$0.00</div>
          <div className="text-green-300 text-sm">Agrega fondos para comenzar</div>
        </div>
      )}

      {wallets.length > 1 && (
        <div className="flex gap-2 mt-4 flex-wrap">
          {wallets.slice(1).map((w) => (
            <div key={w.coin} className="bg-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-xs">{COINS[w.coin].flag}</span>
              <span className="text-xs font-mono font-semibold">
                {hidden ? '••••' : Number(w.available).toLocaleString()} {w.coin}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
