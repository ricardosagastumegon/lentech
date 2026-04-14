'use client';

import { useEffect, useState } from 'react';
import { getTickerRates } from '@/lib/fx-engine';
import { COINS, CoinCode } from '@/store/wallet.store';

type TickerRate = { from: CoinCode; to: CoinCode; rate: number; rateStr: string; change: number };

function buildRates(): TickerRate[] {
  return getTickerRates().map(r => ({
    ...r,
    change: (Math.random() - 0.48) * 0.8, // demo fluctuation ±0.8%
  }));
}

export function RatesTicker() {
  const [rates, setRates] = useState<TickerRate[]>(buildRates);

  // Subtle live animation every 8s
  useEffect(() => {
    const id = setInterval(() => {
      setRates(prev => prev.map(r => ({
        ...r,
        rate: +(r.rate * (1 + (Math.random() - 0.5) * 0.0015)).toFixed(6),
        rateStr: (r.rate * (1 + (Math.random() - 0.5) * 0.0015)).toFixed(r.rate < 0.01 ? 6 : 4),
        change: +((r.change + (Math.random() - 0.5) * 0.1)).toFixed(2),
      })));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card py-4 px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-len-dark">Tipos de cambio</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">En vivo</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-2.5 pb-1" style={{ minWidth: 'max-content' }}>
          {rates.map(r => {
            const fm = COINS[r.from];
            const tm = COINS[r.to];
            const up = r.change >= 0;
            return (
              <div key={`${r.from}-${r.to}`}
                className="flex-shrink-0 bg-len-surface rounded-2xl border border-len-border px-3 py-2.5 min-w-[138px]">
                {/* Pair header */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs">{fm.flag}</span>
                  <span className="text-[10px] font-bold text-gray-500">{r.from}</span>
                  <span className="text-gray-300 text-[10px] mx-0.5">→</span>
                  <span className="text-xs">{tm.flag}</span>
                  <span className="text-[10px] font-bold text-gray-500">{r.to}</span>
                </div>
                {/* Rate */}
                <div className="flex items-end justify-between gap-1">
                  <span className="text-sm font-black text-len-dark tabular-nums">{r.rateStr}</span>
                  <span className={`text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {up ? '▲' : '▼'}{Math.abs(r.change).toFixed(2)}%
                  </span>
                </div>
                {/* Fiat labels */}
                <p className="text-[9px] text-gray-300 mt-0.5">
                  {fm.fiat} → {tm.fiat}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
