'use client';

import { ChangeEvent } from 'react';

const COUNTRY_PREFIXES: Record<string, string> = {
  GT: '+502', MX: '+52', HN: '+504', SV: '+503',
  NI: '+505', BZ: '+501', CR: '+506', US: '+1',
};

interface PhoneInputProps {
  value: string;
  country?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

export function PhoneInput({ value, country = 'GT', onChange, disabled, error, label, className }: PhoneInputProps) {
  const prefix = COUNTRY_PREFIXES[country] ?? '+502';

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw ? `${prefix}${raw}` : '');
  }

  const displayValue = value.startsWith(prefix) ? value.slice(prefix.length) : value.replace(/^\+\d+/, '');

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className={`flex border-2 rounded-xl overflow-hidden transition-colors
        ${error ? 'border-red-400' : 'border-gray-200 focus-within:border-mondega-green'}`}
      >
        <span className="flex items-center px-3 bg-gray-50 text-gray-600 text-sm font-mono border-r border-gray-200">
          {prefix}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handle}
          disabled={disabled}
          placeholder="50000000"
          className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white disabled:opacity-50"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
