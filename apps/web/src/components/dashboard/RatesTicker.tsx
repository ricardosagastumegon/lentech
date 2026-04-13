'use client';

import { useEffect, useState } from 'react';
import { COINS, CoinCode } from '@/store/wallet.store';

// Demo rates (replaced by API when backend is live)
const DEMO_RATES = [
  { from: 'QUETZA',  to: 'MEXCOIN', rate: 2.42,  change: +0.31 },
  { from: 'MEXCOIN', to: 'QUETZA',  rate: 0.413, change: -0.12 },
  { from: 'QUETZA',  to: 'LEMPI',   rate: 3.21,  change: +0.08 },
  { from: 'LEMPI',   to: 'QUETZA',  rate: 0.311, change: -0.05 },
  { from: 'MEXCOIN', to: 'LEMPI',   rate: 1.32,  change: +0.18 },
  { from: 'QUETZA',  to: 'DOLAR',   rate: 0.130, change: +0.01 },
  { from: 'MEXCOIN', to: 'DOLAR',   rate: 0.053, change: -0.02 },
];

interface Rate { from: CoinCode; to: CoinCode; rate: number; change: number }

export function RatesTicker() {
  const [rates, setRates] = useState<Rate[]>(DEMO_RATES as Rate[]);

  // Subtle animation: slightly vary rates every 8s to feel "live"
  useEffect(() => {
    const id = setInterval(() => {
      setRates(prev => prev.map(r => ({
        ...r,
        rate: +(r.rate * (1 + (Math.random() - 0.5) * 0.002)).toFixed(4),
        change: +(r.change + (Math.random() - 0.5) * 0.05).toFixed(2),
      })));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card py-4">
      <div className="flex items-center justify-between mb-3 px-0">
        <h3 className="text-sm font-semibold text-len-dark">Tipos de cambio en vivo</h3>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
          LIVE
        </span>
      </div>
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
          {rates.map(r => {
            const fromMeta = COINS[r.from];
            const toMeta = COINS[r.to];
            const up = r.change >= 0;
            return (
              <div
                key={`${r.from}-${r.to}`}
                className="flex-shrink-0 bg-len-surface rounded-2xl border border-len-border px-3 py-2.5 min-w-[130px]"
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-xs">{fromMeta.flag}</span>
                  <span className="text-[10px] font-bold text-gray-500">{r.from}</span>
                  <span className="text-gray-300 text-xs">→</span>
                  <span className="text-xs">{toMeta.flag}</span>
                  <span className="text-[10px] font-bold text-gray-500">{r.to}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-black text-len-dark">{r.rate.toFixed(4)}</span>
                  <span className={`text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {up ? '▲' : '▼'} {Math.abs(r.change).toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
