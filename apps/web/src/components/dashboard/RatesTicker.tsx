'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Rate {
  fromCoin: string;
  toCoin: string;
  rate: number;
  change24h?: number;
}

export function RatesTicker() {
  const [rates, setRates] = useState<Rate[]>([]);

  useEffect(() => {
    apiClient.get('/fx/rates')
      .then(r => setRates(r.data.rates ?? []))
      .catch(() => {});
    const id = setInterval(() => {
      apiClient.get('/fx/rates')
        .then(r => setRates(r.data.rates ?? []))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  if (rates.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <div className="flex gap-6 animate-none overflow-x-auto pb-1 scrollbar-hide">
        {rates.map(r => (
          <div key={`${r.fromCoin}-${r.toCoin}`} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 font-mono">{r.fromCoin}/{r.toCoin}</span>
            <span className="text-sm font-semibold text-gray-800">{r.rate.toFixed(4)}</span>
            {r.change24h !== undefined && (
              <span className={`text-xs font-medium ${r.change24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {r.change24h >= 0 ? '+' : ''}{r.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
