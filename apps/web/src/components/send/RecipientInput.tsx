'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface ResolvedRecipient {
  userId: string;
  displayName: string;
  walletAddress: string;
  kycLevel: number;
}

interface RecipientInputProps {
  value: string;
  onChange: (val: string) => void;
  onResolved: (r: ResolvedRecipient | null) => void;
  error?: string;
}

export function RecipientInput({ value, onChange, onResolved, error }: RecipientInputProps) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedRecipient | null>(null);

  const resolve = useCallback(async (val: string) => {
    if (!val.trim()) { setResolved(null); onResolved(null); return; }
    setResolving(true);
    try {
      const res = await apiClient.post('/wallets/resolve-recipient', { recipient: val });
      setResolved(res.data);
      onResolved(res.data);
    } catch {
      setResolved(null);
      onResolved(null);
    } finally {
      setResolving(false);
    }
  }, [onResolved]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Destinatario</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setResolved(null); onResolved(null); }}
          onBlur={() => resolve(value)}
          placeholder="Teléfono, dirección de wallet o usr_..."
          className={`input-field w-full pr-12 ${error ? 'border-red-400 focus:ring-red-500' : ''}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {resolving && <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-mondega-green" />}
          {!resolving && resolved && <span className="text-green-500 text-lg">✓</span>}
        </div>
      </div>
      {resolved && (
        <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm font-semibold text-green-800">{resolved.displayName}</p>
          <p className="text-xs text-green-600 font-mono mt-0.5">
            {resolved.walletAddress.slice(0, 8)}...{resolved.walletAddress.slice(-6)}
          </p>
          <p className="text-xs text-green-600 mt-0.5">KYC nivel {resolved.kycLevel}</p>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
