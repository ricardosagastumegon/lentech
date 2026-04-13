'use client';

import { useEffect, useState } from 'react';
import { FXQuoteResult } from '@/lib/fx-engine';
import { COINS } from '@/store/wallet.store';

interface Props {
  quote: FXQuoteResult;
  recipient: string;
}

export function FXQuoteCard({ quote, recipient }: Props) {
  const [secsLeft, setSecsLeft] = useState(30);
  const isSameCoin = quote.fromCoin === quote.toCoin;

  useEffect(() => {
    setSecsLeft(Math.max(0, Math.round((quote.validUntil.getTime() - Date.now()) / 1000)));
    const t = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [quote.validUntil]);

  const pct    = (secsLeft / 30) * 100;
  const urgent = secsLeft <= 10;

  const fm = COINS[quote.fromCoin];
  const tm = COINS[quote.toCoin];

  return (
    <div className="rounded-3xl border-2 border-len-border overflow-hidden">
      {/* Header */}
      <div className="bg-len-gradient px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white/60 text-xs font-medium">Cotización para</p>
          <p className="text-white font-bold text-sm">{recipient}</p>
        </div>
        {!isSameCoin && (
          <div className="text-right">
            <p className={`text-xs font-bold ${urgent ? 'text-red-300' : 'text-white/70'}`}>
              {urgent ? '⚠ ' : ''}Válido {secsLeft}s
            </p>
            <div className="w-20 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-400' : 'bg-white/80'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4 space-y-3">

        {/* Tú envías */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{fm.flag}</span>
            <div>
              <p className="text-xs text-gray-400">Tú envías</p>
              <p className="font-black text-len-dark text-lg tabular-nums">
                {quote.fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-sm font-bold text-gray-400 ml-1">{quote.fromCoin}</span>
              </p>
            </div>
          </div>
          {/* Fiat local — same number, different label (1:1 peg) */}
          <div className="text-right text-xs text-gray-400 font-medium">
            = {quote.fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {fm.fiat}
          </div>
        </div>

        {/* FX breakdown (only if cross-coin) */}
        {!isSameCoin && (
          <div className="bg-len-light rounded-2xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Tipo de cambio</span>
              <span className="font-mono font-bold text-len-dark">{quote.rateDisplay}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Comisión LEN ({(quote.feePercent * 100).toFixed(1)}%)</span>
              <span className="font-mono text-gray-600">
                -{quote.feeAmount.toFixed(4)} {quote.fromCoin}
              </span>
            </div>
          </div>
        )}

        {/* El destinatario recibe */}
        <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tm.flag}</span>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Destinatario recibe</p>
              <p className="font-black text-emerald-800 text-xl tabular-nums">
                {quote.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-sm font-bold ml-1">{quote.toCoin}</span>
              </p>
            </div>
          </div>
          {/* Local fiat equivalent */}
          <div className="text-right text-xs text-emerald-600 font-medium">
            = {quote.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {tm.fiat}
          </div>
        </div>

        {/* Peg reminder */}
        <div className="flex items-center justify-between text-xs text-gray-300 px-1">
          <span>1 {quote.fromCoin} = 1 {fm.fiat}</span>
          <span>⇄</span>
          <span>1 {quote.toCoin} = 1 {tm.fiat}</span>
        </div>
      </div>
    </div>
  );
}
