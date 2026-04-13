'use client';

import { COINS, CoinCode, ACTIVE_COINS } from '@/store/wallet.store';

/** Only Phase-1 active coins for selectors */
const COIN_LIST = ACTIVE_COINS.map(code => ({
  code: code as CoinCode,
  ...COINS[code as CoinCode],
}));

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  fromCoin: CoinCode;
  toCoin: CoinCode;
  onFromCoinChange: (c: CoinCode) => void;
  onToCoinChange: (c: CoinCode) => void;
}

export function AmountInput({
  value,
  onChange,
  fromCoin,
  toCoin,
  onFromCoinChange,
  onToCoinChange,
}: AmountInputProps) {
  const isFX = fromCoin !== toCoin;
  const fm = COINS[fromCoin];
  const tm = COINS[toCoin];

  return (
    <div className="bg-white rounded-3xl border-2 border-len-border p-5 space-y-5">
      {/* You send */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Tú envías
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            inputMode="decimal"
            className="flex-1 text-4xl font-black text-len-dark border-0 outline-none bg-transparent min-w-0 placeholder:text-gray-200"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min="0"
          />
          {/* From coin pill selector */}
          <div className="relative">
            <select
              value={fromCoin}
              onChange={(e) => onFromCoinChange(e.target.value as CoinCode)}
              className="appearance-none bg-len-light border-2 border-len-border rounded-2xl pl-3 pr-8 py-2.5
                         text-sm font-black text-len-dark focus:outline-none focus:border-len-purple
                         cursor-pointer transition-all"
            >
              {COIN_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 font-medium">
          1 {fromCoin} = 1 {fm.fiat} · {fm.name}
        </p>
      </div>

      {/* FX swap indicator */}
      {isFX ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-len-border" />
          <div className="w-8 h-8 bg-len-gradient rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-sm">⇄</span>
          </div>
          <div className="flex-1 h-px bg-len-border" />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-len-border" />
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 text-sm">↓</span>
          </div>
          <div className="flex-1 h-px bg-len-border" />
        </div>
      )}

      {/* Recipient receives */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Destinatario recibe en
        </label>
        <div className="relative">
          <select
            value={toCoin}
            onChange={(e) => onToCoinChange(e.target.value as CoinCode)}
            className="w-full appearance-none bg-len-light border-2 border-len-border rounded-2xl pl-4 pr-10 py-3
                       text-sm font-black text-len-dark focus:outline-none focus:border-len-purple
                       cursor-pointer transition-all"
          >
            {COIN_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag}  {c.code} — {c.name}
              </option>
            ))}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 font-medium">
          1 {toCoin} = 1 {tm.fiat} · {tm.name}
        </p>
      </div>

      {/* Coming soon hint */}
      <div className="bg-len-light rounded-2xl px-3 py-2 flex items-center gap-2 border border-len-border">
        <span className="text-len-purple text-xs">✦</span>
        <p className="text-xs text-gray-500">
          Más países disponibles en <span className="font-bold text-len-purple">Fase 2</span> — Colón, Dólar y más
        </p>
      </div>
    </div>
  );
}
