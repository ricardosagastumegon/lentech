'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { COINS } from '@/store/wallet.store';

interface ResolvedRecipient {
  userId:        string;
  displayName:   string;
  walletAddress: string;
  kycLevel:      number;
  country?:      string;
}

interface RecipientInputProps {
  value:      string;
  onChange:   (val: string) => void;
  onResolved: (r: ResolvedRecipient | null) => void;
  error?:     string;
}

// Demo users resolved locally — no backend needed
const DEMO_RECIPIENTS: Record<string, ResolvedRecipient> = {
  '11111': { userId: 'demo-gt', displayName: 'Carlos Mendoza',  walletAddress: '11111', kycLevel: 2, country: 'GT' },
  '22222': { userId: 'demo-mx', displayName: 'Sofía Hernández', walletAddress: '22222', kycLevel: 2, country: 'MX' },
  '33333': { userId: 'demo-hn', displayName: 'José Reyes',      walletAddress: '33333', kycLevel: 2, country: 'HN' },
};

const FLAG: Record<string, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const COIN: Record<string, string> = { GT: 'QUETZA', MX: 'MEXCOIN', HN: 'LEMPI' };

function tryDemo(val: string): ResolvedRecipient | null {
  const clean = val.trim();
  const key   = Object.keys(DEMO_RECIPIENTS).find(k => clean === k || clean.endsWith(k));
  return key ? DEMO_RECIPIENTS[key] : null;
}

export function RecipientInput({ value, onChange, onResolved, error }: RecipientInputProps) {
  const [resolving, setResolving] = useState(false);
  const [resolved,  setResolved]  = useState<ResolvedRecipient | null>(null);

  const resolve = useCallback(async (val: string) => {
    const clean = val.trim();
    if (!clean) { setResolved(null); onResolved(null); return; }
    const demo = tryDemo(clean);
    if (demo) { setResolved(demo); onResolved(demo); return; }
    setResolving(true);
    try {
      const res = await apiClient.post('/wallets/resolve-recipient', { recipient: clean });
      setResolved(res.data);
      onResolved(res.data);
    } catch {
      setResolved(null);
      onResolved(null);
    } finally {
      setResolving(false);
    }
  }, [onResolved]);

  function pick(d: ResolvedRecipient) {
    onChange(d.walletAddress);
    setResolved(d);
    onResolved(d);
  }

  const coin     = resolved?.country ? COIN[resolved.country] : '';
  const coinMeta = coin && coin in COINS ? COINS[coin as keyof typeof COINS] : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Destinatario</label>

      {/* Quick-pick demo users */}
      <div className="flex gap-2 mb-2">
        {Object.values(DEMO_RECIPIENTS).map(d => (
          <button key={d.userId} type="button" onClick={() => pick(d)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl border transition-all
              ${resolved?.userId === d.userId
                ? 'border-len-purple bg-white shadow-sm'
                : 'border-len-border bg-len-light hover:border-len-violet'}`}>
            <span className="text-base">{FLAG[d.country ?? ''] ?? '🌎'}</span>
            <span className="text-[10px] font-bold text-len-dark">{d.displayName.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => {
            const v = e.target.value;
            onChange(v);
            const demo = tryDemo(v);
            if (demo) { setResolved(demo); onResolved(demo); }
            else      { setResolved(null); onResolved(null); }
          }}
          onBlur={() => resolve(value)}
          placeholder="Teléfono LEN o selecciona arriba"
          className={`input-field w-full pr-12 ${error ? 'border-red-400' : ''}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {resolving  && <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-len-purple" />}
          {!resolving && resolved && <span className="text-emerald-500 text-lg">✓</span>}
        </div>
      </div>

      {resolved && (
        <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
          <span className="text-2xl">{FLAG[resolved.country ?? ''] ?? '🌎'}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">{resolved.displayName}</p>
            {coinMeta && <p className="text-xs text-emerald-600 mt-0.5">{coin} · {coinMeta.fiat}</p>}
          </div>
          <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-lg">✓ Verificado</span>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
