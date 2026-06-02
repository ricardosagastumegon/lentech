'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore, COINS } from '@/store/wallet.store';

export function BalanceCard({ loading }: { loading: boolean }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const wallets = useWalletStore(s => s.wallets);

  if (loading) {
    return (
      <div className="rounded-3xl overflow-hidden shadow-len-lg animate-pulse">
        <div className="h-40 bg-len-gradient" />
      </div>
    );
  }

  const w = wallets[0];
  if (!w) {
    return (
      <div className="rounded-3xl border-2 border-len-border bg-white p-6 text-center">
        <p className="text-gray-400 text-sm">Sin wallet activa</p>
        <button onClick={() => router.push('/add-money')}
          className="btn-primary mt-3 text-sm px-6 py-2">
          Depositar →
        </button>
      </div>
    );
  }

  const meta    = COINS[w.coin];
  // Saldo único: el depósito fiat ya se convirtió 1:1 al coin (ver foldFiatIntoCoin).
  const balance = parseFloat(w.available ?? '0');

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Abbreviate large numbers — 1,250,000 → "1.25M", 50,000 → "50K"
  function fmtShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}M`;
    if (n >= 10_000)    return `${(n / 1_000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
    return fmt(n);
  }

  return (
    <div className="rounded-3xl overflow-hidden shadow-len-lg border border-len-border">

      {/* ── Saldo único: el coin (el depósito ya se convirtió 1:1) ── */}
      <div className="bg-len-gradient px-5 pt-5 pb-5 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-6 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{meta.flag}</span>
              <div>
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                  Mi saldo
                </p>
                <p className="text-white/80 text-xs font-medium">{meta.name}</p>
              </div>
            </div>
            <button
              onClick={() => setHidden(h => !h)}
              className="text-white/50 hover:text-white text-[10px] font-bold bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1 transition-all"
            >
              {hidden ? '👁' : '🙈'}
            </button>
          </div>

          {/* Single balance */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-white/50 text-base font-bold mr-1">{meta.symbol}</span>
              <span
                className="text-4xl font-black text-white tracking-tight tabular-nums"
                title={hidden ? undefined : fmt(balance)}
              >
                {hidden ? '•••••' : fmtShort(balance)}
              </span>
              <span className="text-white/60 text-sm font-bold ml-1.5">{w.coin}</span>
            </div>
            <button
              onClick={() => router.push('/add-money')}
              className="bg-white text-len-purple font-black text-xs px-3 py-2 rounded-full
                         hover:bg-len-light active:scale-95 transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
            >
              + Depositar
            </button>
          </div>

          {/* Peg reminder */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-white font-black bg-white/15 rounded-full px-2 py-0.5">1:1</span>
            <span className="text-[10px] text-white/50">
              1 {w.coin} = 1 {meta.fiat} · respaldado en tu banco
            </span>
          </div>
        </div>
      </div>

      {/* Additional wallets (multi-coin) */}
      {wallets.length > 1 && (
        <div className="bg-white px-5 py-3">
          <div className="flex gap-2 flex-wrap">
            {wallets.slice(1).map(ow => (
              <div key={ow.coin}
                className="flex items-center gap-1.5 bg-len-light rounded-xl px-2.5 py-1.5 border border-len-border">
                <span className="text-xs">{COINS[ow.coin].flag}</span>
                <span className="text-xs font-bold text-len-dark">
                  {hidden ? '••••' : fmt(parseFloat(ow.available))} {ow.coin}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
