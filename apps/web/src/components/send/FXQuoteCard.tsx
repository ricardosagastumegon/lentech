'use client';

import { useEffect, useState, useCallback } from 'react';

interface FXQuote {
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  feePercent: number;
  expiresAt: string;
  quoteId: string;
}

interface FXQuoteCardProps {
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  onQuote: (q: FXQuote | null) => void;
  fetchQuote: (from: string, to: string, amount: number) => Promise<FXQuote>;
}

export function FXQuoteCard({ fromCoin, toCoin, fromAmount, onQuote, fetchQuote }: FXQuoteCardProps) {
  const [quote, setQuote] = useState<FXQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const load = useCallback(async () => {
    if (fromAmount <= 0) return;
    setLoading(true);
    try {
      const q = await fetchQuote(fromCoin, toCoin, fromAmount);
      setQuote(q);
      onQuote(q);
      const secs = Math.floor((new Date(q.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, secs));
    } catch {
      setQuote(null);
      onQuote(null);
    } finally {
      setLoading(false);
    }
  }, [fromCoin, toCoin, fromAmount, fetchQuote, onQuote]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { load(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft, load]);

  if (loading) return (
    <div className="bg-blue-50 rounded-2xl p-4 animate-pulse text-center text-blue-400 text-sm">
      Obteniendo cotización...
    </div>
  );

  if (!quote) return null;

  const pct = secondsLeft > 0 ? (secondsLeft / 30) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Cotización bloqueada</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-blue-600 w-6">{secondsLeft}s</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Envías</span>
          <span className="font-semibold">{quote.fromAmount.toLocaleString()} {quote.fromCoin}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tasa</span>
          <span className="font-mono">1 {fromCoin} = {quote.rate.toFixed(6)} {toCoin}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fee ({quote.feePercent}%)</span>
          <span className="text-gray-500">-{quote.fee.toLocaleString()} {quote.fromCoin}</span>
        </div>
        <div className="border-t border-blue-200 pt-2 flex justify-between">
          <span className="font-semibold text-gray-900">Recibe</span>
          <span className="font-bold text-lg text-mondega-green">
            {quote.toAmount.toLocaleString()} {quote.toCoin}
          </span>
        </div>
      </div>
    </div>
  );
}
