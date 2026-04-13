'use client';

import { useState } from 'react';
import { useWalletStore, COINS } from '@/store/wallet.store';

export function BalanceCard({ loading }: { loading: boolean }) {
  const [hidden, setHidden] = useState(false);
  const wallets = useWalletStore(s => s.wallets);

  if (loading) {
    return (
      <div className="rounded-3xl p-6 bg-len-gradient shadow-len-lg animate-pulse">
        <div className="h-4 bg-white/20 rounded-full w-28 mb-6" />
        <div className="h-12 bg-white/20 rounded-full w-48 mb-2" />
        <div className="h-4 bg-white/20 rounded-full w-32" />
      </div>
    );
  }

  const primaryWallet = wallets[0];
  const coinMeta = primaryWallet ? COINS[primaryWallet.coin] : null;
  const totalUSD = wallets.reduce((s, w) => s + w.balanceUSD, 0);

  return (
    <div className="rounded-3xl p-6 bg-len-gradient shadow-len-lg relative overflow-hidden">
      {/* Decorative circle */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {coinMeta && <span className="text-2xl">{coinMeta.flag}</span>}
            <div>
              <p className="text-white/60 text-xs font-medium">Balance disponible</p>
              <p className="text-white/90 text-sm font-semibold">{coinMeta?.name ?? 'Mi wallet'}</p>
            </div>
          </div>
          <button
            onClick={() => setHidden(h => !h)}
            className="text-white/60 hover:text-white text-xs font-medium transition-colors bg-white/10 rounded-full px-3 py-1"
          >
            {hidden ? '👁 Mostrar' : '🙈 Ocultar'}
          </button>
        </div>

        {/* Main balance */}
        {primaryWallet ? (
          <>
            <div className="mb-1">
              <span className="text-5xl font-black text-white tracking-tight">
                {hidden ? '••••••' : Number(primaryWallet.available).toLocaleString('en-US', {
                  minimumFractionDigits: 2, maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-white/70 text-xl font-bold ml-2">{primaryWallet.coin}</span>
            </div>
            <p className="text-white/50 text-sm">
              {hidden ? '≈ $•••• USD' : `≈ $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
            </p>
          </>
        ) : (
          <div className="py-3">
            <div className="text-5xl font-black text-white">$0.00</div>
            <p className="text-white/50 text-sm mt-1">Agrega fondos para comenzar</p>
          </div>
        )}

        {/* Extra wallets */}
        {wallets.length > 1 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {wallets.slice(1).map(w => (
              <div key={w.coin} className="bg-white/10 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 border border-white/15">
                <span className="text-sm">{COINS[w.coin].flag}</span>
                <span className="text-white/80 text-xs font-bold">
                  {hidden ? '••••' : Number(w.available).toLocaleString()} {w.coin}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
