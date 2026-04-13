'use client';

const COUNTRIES = [
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', currency: 'GTQ' },
  { code: 'MX', name: 'México',    flag: '🇲🇽', currency: 'MXN' },
  { code: 'HN', name: 'Honduras',  flag: '🇭🇳', currency: 'HNL' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', currency: 'SVC' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', currency: 'NIO' },
  { code: 'BZ', name: 'Belize',    flag: '🇧🇿', currency: 'BZD' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', currency: 'CRC' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD' },
];

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function CountrySelector({ value, onChange, label, disabled, error, className }: CountrySelectorProps) {
  const selected = COUNTRIES.find(c => c.code === value);

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none
          focus:border-mondega-green transition-colors bg-white appearance-none
          ${error ? 'border-red-400' : 'border-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="">Selecciona tu país</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.currency})
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export { COUNTRIES };
