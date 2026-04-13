'use client';

const COINS = ['QUETZA', 'MONDG', 'LEMPI', 'COLON', 'CORDO'];

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  fromCoin: string;
  toCoin: string;
  onFromCoinChange: (c: string) => void;
  onToCoinChange: (c: string) => void;
}

export function AmountInput({
  value,
  onChange,
  fromCoin,
  toCoin,
  onFromCoinChange,
  onToCoinChange,
}: AmountInputProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Envías</label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            className="flex-1 text-2xl font-bold text-gray-900 border-0 outline-none bg-transparent min-w-0"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min="0"
          />
          <select
            value={fromCoin}
            onChange={(e) => onFromCoinChange(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mondega-green"
          >
            {COINS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Recibe en</label>
        <select
          value={toCoin}
          onChange={(e) => onToCoinChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mondega-green"
        >
          {COINS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
