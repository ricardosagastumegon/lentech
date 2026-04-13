'use client';

import { COINS, CoinCode, COUNTRY_TO_COIN } from '@/store/wallet.store';
import { useAuthStore } from '@/store/auth.store';

const COIN_LIST = Object.entries(COINS).map(([code, meta]) => ({
  code: code as CoinCode,
  ...meta,
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Tú envías</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            inputMode="decimal"
            className="flex-1 text-3xl font-bold text-gray-900 border-0 outline-none bg-transparent min-w-0"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min="0"
          />
          <select
            value={fromCoin}
            onChange={(e) => onFromCoinChange(e.target.value as CoinCode)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {COIN_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          1 {fromCoin} = 1 {COINS[fromCoin].fiat}
        </div>
      </div>

      {isFX && (
        <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
          <span className="text-blue-500 text-sm">⇄</span>
          <span className="text-xs text-blue-700 font-medium">
            Conversión automática {fromCoin} → {toCoin} al tipo de cambio actual
          </span>
        </div>
      )}

      <div className="border-t border-gray-100" />

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">El destinatario recibe en</label>
        <select
          value={toCoin}
          onChange={(e) => onToCoinChange(e.target.value as CoinCode)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {COIN_LIST.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} — {c.name}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-400 mt-1">
          1 {toCoin} = 1 {COINS[toCoin].fiat}
        </div>
      </div>
    </div>
  );
}
