'use client';

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface PINInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  error?: string;
}

export function PINInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  label,
  error,
}: PINInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function focus(i: number) {
    inputsRef.current[i]?.focus();
  }

  function handleChange(i: number, char: string) {
    if (!/^\d?$/.test(char)) return;
    const next = digits.map((d, idx) => (idx === i ? char : d)).join('');
    onChange(next);
    if (char && i < length - 1) focus(i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        handleChange(i, '');
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(value.length > pasted.length ? value.length : pasted.length, '').slice(0, length));
    if (pasted.length > 0) focus(Math.min(pasted.length, length - 1));
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div className="flex gap-3 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputsRef.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-mondega-green focus:border-mondega-green
              transition-colors
              ${d ? 'border-mondega-green bg-green-50' : 'border-gray-200 bg-white'}
              ${error ? 'border-red-400 bg-red-50' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
