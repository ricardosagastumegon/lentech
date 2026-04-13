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
        <div className="h-32 bg-len-gradient" />
        <div className="h-28 bg-white border border-len-border p-5">
          <div className="h-3 bg-gray-100 rounded-full w-24 mb-3" />
          <div className="h-8 bg-gray-100 rounded-full w-40" />
        </div>
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

  const meta         = COINS[w.coin];
  const fiat         = parseFloat(w.fiatBalance ?? '0');
  const tokens       = parseFloat(w.available ?? '0');
  const hasFiat      = fiat > 0;
  const hasTokens    = tokens > 0;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-3xl overflow-hidden shadow-len-lg border border-len-border">

      {/* ── Top section: Fiat (moneda local depositada) ── */}
      <div className="bg-len-gradient px-5 pt-5 pb-4 relative overflow-hidden">
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
                  Saldo {meta.fiat} depositado
                </p>
                <p className="text-white/80 text-xs font-medium">
                  {hasFiat ? 'Disponible para comprar tokens' : 'Sin saldo — deposita en tu banco'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setHidden(h => !h)}
              className="text-white/50 hover:text-white text-[10px] font-bold bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1 transition-all"
            >
              {hidden ? '👁' : '🙈'}
            </button>
          </div>

          {/* Fiat amount */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-white/50 text-lg font-bold mr-1">{meta.symbol}</span>
              <span className="text-4xl font-black text-white tracking-tight">
                {hidden ? '••••••' : fmt(fiat)}
              </span>
              <span className="text-white/60 text-base font-bold ml-2">{meta.fiat}</span>
            </div>
            {/* Comprar button — only if fiat > 0 */}
            {hasFiat && (
              <button
                onClick={() => router.push('/buy-tokens')}
                className="bg-white text-len-purple font-black text-xs px-4 py-2 rounded-full
                           hover:bg-len-light active:scale-95 transition-all shadow-sm flex-shrink-0"
              >
                Comprar tokens →
              </button>
            )}
            {!hasFiat && (
              <button
                onClick={() => router.push('/add-money')}
                className="bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-full
                           hover:bg-white/30 active:scale-95 transition-all border border-white/30 flex-shrink-0"
              >
                + Depositar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom section: Token balance (QUETZA) ── */}
      <div className="bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-len-light rounded-lg flex items-center justify-center border border-len-border">
              <span className="text-sm">{meta.flag}</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                Mis tokens
              </p>
              <p className="text-xs text-gray-500 font-medium">{meta.name}</p>
            </div>
          </div>
          {/* Vender button — only if tokens > 0 */}
          {hasTokens && (
            <button
              onClick={() => router.push('/sell-tokens')}
              className="text-len-purple bg-len-light border border-len-border font-bold text-xs
                         px-3 py-1.5 rounded-full hover:border-len-purple active:scale-95 transition-all"
            >
              Vender →
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-black text-len-dark tracking-tight">
              {hidden ? '••••' : fmt(tokens)}
            </span>
            <span className="text-gray-400 text-base font-bold ml-2">{w.coin}</span>
          </div>

          {/* Peg reminder */}
          <div className="text-right">
            <p className="text-[10px] text-emerald-600 font-bold">1:1</p>
            <p className="text-[10px] text-gray-300">1 {w.coin} = 1 {meta.fiat}</p>
          </div>
        </div>

        {/* Additional wallets (multi-coin) */}
        {wallets.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap pt-3 border-t border-len-border">
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
        )}
      </div>
    </div>
  );
}
