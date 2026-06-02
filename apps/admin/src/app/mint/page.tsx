'use client';

/**
 * Mint Manual — admin panel page
 *
 * Permite registrar un depósito bancario y mintear el token correspondiente
 * en Celo. Lee la regla de comisión dinámica, muestra preview en tiempo real,
 * y registra todo en Firestore.
 */

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/admin.store';

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_LEN_API_URL ?? 'https://web-production-1c372.up.railway.app';

type Country = 'MX' | 'GT' | 'HN';
const COUNTRY_FLAG: Record<Country, string>     = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const COUNTRY_NAME: Record<Country, string>     = { GT: 'Guatemala', MX: 'México', HN: 'Honduras' };
const COUNTRY_TOKEN: Record<Country, string>    = { GT: 'QUETZA', MX: 'MEXCOIN', HN: 'LEMPI' };
const COUNTRY_FIAT: Record<Country, string>     = { GT: 'GTQ', MX: 'MXN', HN: 'HNL' };
const COUNTRY_PREFIX: Record<Country, string>   = { GT: 'Q', MX: '$', HN: 'L' };

interface CommissionRule {
  rule_id:     string;
  operation:   string;
  country:     Country;
  fee_percent: number;
  fee_min:     number;
  fee_max:     number;
  splits:      Array<{ recipient_id: string; name: string; percent: number; wallet_celo: string; active: boolean }>;
}

interface MintResponse {
  mint_id:      string;
  country:      Country;
  token:        string;
  user_wallet:  string;
  gross_amount: string;
  fee_amount:   string;
  net_amount:   string;
  fee_percent:  number;
  user_tx_hash: string;
  splits:       Array<{ recipient_id: string; wallet: string; amount: number; tx_hash: string | null; error?: string }>;
}

interface RecentMint {
  mint_id:        string;
  country:        Country;
  token:          string;
  user_wallet:    string;
  gross_amount:   string;
  fee_amount:     string;
  net_amount:     string;
  bank_reference: string;
  user_tx_hash:   string;
  notes?:         string | null;
  created_at:     string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcPreview(gross: number, rule: CommissionRule | null) {
  if (!rule || !gross || gross <= 0) {
    return { fee: 0, net: 0 };
  }
  let fee = gross * (rule.fee_percent / 100);
  if (rule.fee_min > 0 && fee < rule.fee_min) fee = rule.fee_min;
  if (rule.fee_max > 0 && fee > rule.fee_max) fee = rule.fee_max;
  fee = Math.round(fee * 100) / 100;
  const net = Math.round((gross - fee) * 100) / 100;
  return { fee, net };
}

function explorerLink(hash: string): string {
  // Mainnet first; Sepolia si no
  return `https://celoscan.io/tx/${hash}`;
}

function shortHash(s: string): string {
  if (!s) return '';
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MintManualPage() {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);

  // ── Admin API key (en localStorage, no se sube a git) ──────────────────
  const [apiKey,        setApiKey]        = useState('');
  const [apiKeySaved,   setApiKeySaved]   = useState(false);

  // ── Form ────────────────────────────────────────────────────────────────
  const [country,    setCountry]    = useState<Country>('GT');
  const [wallet,     setWallet]     = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [bankRef,    setBankRef]    = useState('');
  const [notes,      setNotes]      = useState('');

  // ── State ──────────────────────────────────────────────────────────────
  const [rule,         setRule]         = useState<CommissionRule | null>(null);
  const [loadingRule,  setLoadingRule]  = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [result,       setResult]       = useState<MintResponse | null>(null);
  const [error,        setError]        = useState('');
  const [recentMints,  setRecentMints]  = useState<RecentMint[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);

  // ── Load API key from localStorage on mount ────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('len_admin_api_key');
    if (saved) { setApiKey(saved); setApiKeySaved(true); }
  }, []);

  // ── Load commission rule when country changes ──────────────────────────
  useEffect(() => {
    if (!apiKeySaved) return;
    setLoadingRule(true);
    fetch(`${API_BASE}/api/admin/commission?id=deposit_${country}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
      .then(r => r.json())
      .then(j => { if (j.ok) setRule(j.data); })
      .catch(() => setError('No se pudo cargar regla de comisión'))
      .finally(() => setLoadingRule(false));
  }, [country, apiKey, apiKeySaved]);

  // ── Load recent mints ──────────────────────────────────────────────────
  async function loadRecentMints() {
    if (!apiKeySaved) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/mints?limit=20`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const j = await res.json();
      if (j.ok) setRecentMints(j.data);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (apiKeySaved) loadRecentMints();
  }, [apiKeySaved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save API key ───────────────────────────────────────────────────────
  function saveApiKey() {
    if (apiKey.length < 32) {
      setError('API key debe ser de al menos 32 caracteres');
      return;
    }
    localStorage.setItem('len_admin_api_key', apiKey);
    setApiKeySaved(true);
    setError('');
  }

  function clearApiKey() {
    localStorage.removeItem('len_admin_api_key');
    setApiKey('');
    setApiKeySaved(false);
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    setResult(null);

    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Wallet inválida — debe ser formato 0x + 40 caracteres hex');
      return;
    }
    const grossNum = parseFloat(grossAmount);
    if (isNaN(grossNum) || grossNum <= 0) {
      setError('Monto inválido');
      return;
    }
    if (!bankRef.trim()) {
      setError('Referencia bancaria requerida (ej. id del depósito Banrural)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/mint`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          country,
          wallet,
          gross_amount: grossNum.toFixed(2),
          bank_reference: bankRef.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? 'Error desconocido');
      } else {
        setResult(j.data);
        // Limpiar form
        setWallet('');
        setGrossAmount('');
        setBankRef('');
        setNotes('');
        // Refrescar lista
        loadRecentMints();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return <div className="text-white p-6">Inicia sesión en el panel admin primero.</div>;
  }

  const grossNum   = parseFloat(grossAmount) || 0;
  const preview    = calcPreview(grossNum, rule);
  const prefix     = COUNTRY_PREFIX[country];
  const fiat       = COUNTRY_FIAT[country];
  const tokenName  = COUNTRY_TOKEN[country];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Mint Manual</h1>
        <p className="text-gray-500 text-sm mt-1">
          Registra un depósito bancario para mintear tokens en Celo
        </p>
      </div>

      {/* API Key gate */}
      {!apiKeySaved && (
        <div className="bg-gray-900 border border-amber-700/50 rounded-2xl p-5 space-y-3">
          <p className="text-amber-400 font-bold text-sm">⚠️ Configurar API key admin (una vez)</p>
          <p className="text-xs text-gray-400">
            El valor de <code className="text-amber-300">LEN_ADMIN_API_KEY</code> que está en el
            <code className="text-amber-300"> .env.local</code> del API. Se guarda localmente
            en este navegador.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="LEN_ADMIN_API_KEY (mínimo 32 caracteres)"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={saveApiKey}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm"
          >
            Guardar API key
          </button>
        </div>
      )}

      {apiKeySaved && (
        <>
          {/* Form principal */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="bg-gray-950 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <p className="font-black text-white text-sm">Nuevo depósito</p>
              <button
                onClick={clearApiKey}
                className="text-[10px] text-gray-500 hover:text-red-400"
              >
                cambiar API key
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Country selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  País / Token
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GT', 'MX', 'HN'] as Country[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCountry(c)}
                      className={`px-3 py-3 rounded-2xl border-2 text-sm font-bold transition-all
                        ${country === c
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      <div className="text-xl mb-1">{COUNTRY_FLAG[c]}</div>
                      <div className="text-xs">{COUNTRY_NAME[c]}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{COUNTRY_TOKEN[c]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallet */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Wallet del receptor (Celo address)
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={e => setWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Monto bruto */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Monto depositado ({fiat})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{prefix}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grossAmount}
                    onChange={e => setGrossAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-8 pr-4 py-3 text-base font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Bank reference */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Referencia bancaria (id del depósito)
                </label>
                <input
                  type="text"
                  value={bankRef}
                  onChange={e => setBankRef(e.target.value)}
                  placeholder="Banrural-2026-05-12-001"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Usado para idempotencia — no se puede mintear 2 veces con la misma ref
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contexto: importador Carlos / pago a proveedor en USA / etc."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Preview */}
              {grossNum > 0 && rule && (
                <div className="bg-indigo-950/40 border border-indigo-800 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Preview</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-500">Monto bruto</p>
                      <p className="text-white font-mono font-bold">{prefix}{grossNum.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Comisión ({rule.fee_percent}%)</p>
                      <p className="text-amber-400 font-mono font-bold">−{prefix}{preview.fee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">→ Mintea al usuario</p>
                      <p className="text-emerald-400 font-mono font-bold">{prefix}{preview.net.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 pt-2 border-t border-indigo-900">
                    Token: <span className="text-indigo-300 font-bold">{tokenName}</span> en Celo
                    {' · '}Comisión repartida a {rule.splits.filter(s => s.active).length} beneficiario(s)
                  </p>
                </div>
              )}

              {loadingRule && (
                <div className="bg-gray-800 rounded-2xl p-3 text-center text-xs text-gray-500">
                  Cargando regla de comisión…
                </div>
              )}

              {error && (
                <div className="bg-red-950/40 border border-red-800 rounded-2xl p-3 text-sm text-red-300">
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !wallet || !grossAmount || !bankRef}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm transition-opacity"
              >
                {submitting ? '⟳ Procesando mint en Celo…' : `Confirmar mint de ${tokenName}`}
              </button>
            </div>
          </div>

          {/* Result success */}
          {result && (
            <div className="bg-emerald-950/30 border border-emerald-800 rounded-3xl overflow-hidden">
              <div className="bg-emerald-900/50 px-5 py-3">
                <p className="text-emerald-300 font-bold text-sm">✓ Mint completado</p>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500">Monto a usuario</p>
                    <p className="text-emerald-400 font-mono font-bold text-lg">
                      {COUNTRY_PREFIX[result.country]}{result.net_amount} {result.token}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Comisión retenida</p>
                    <p className="text-amber-400 font-mono font-bold text-lg">
                      {COUNTRY_PREFIX[result.country]}{result.fee_amount}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-emerald-900">
                  <p className="text-[10px] text-gray-500 mb-1">Transacción Celo</p>
                  <a
                    href={explorerLink(result.user_tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 font-mono text-xs break-all hover:underline"
                  >
                    {result.user_tx_hash} →
                  </a>
                </div>
                {result.splits.length > 0 && (
                  <div className="pt-3 border-t border-emerald-900">
                    <p className="text-[10px] text-gray-500 mb-2">Distribución de comisión</p>
                    {result.splits.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-300">{s.recipient_id}</span>
                        <span className="text-xs font-mono text-amber-400">
                          {COUNTRY_PREFIX[result.country]}{s.amount.toFixed(2)}
                          {s.tx_hash ? (
                            <a href={explorerLink(s.tx_hash)} target="_blank" rel="noreferrer" className="text-indigo-400 ml-2 hover:underline">↗</a>
                          ) : (
                            <span className="text-red-400 ml-2 text-[10px]">{s.error ?? 'no tx'}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent mints */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="bg-gray-950 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <p className="font-black text-white text-sm">Últimos mints manuales</p>
              <button
                onClick={loadRecentMints}
                disabled={loadingList}
                className="text-xs text-gray-400 hover:text-indigo-400"
              >
                {loadingList ? '⟳' : 'refrescar'}
              </button>
            </div>
            <div className="divide-y divide-gray-800">
              {recentMints.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-8">Sin mints todavía</p>
              )}
              {recentMints.map(m => (
                <div key={m.mint_id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-800/30">
                  <span className="text-xl flex-shrink-0">{COUNTRY_FLAG[m.country]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-mono">
                      {COUNTRY_PREFIX[m.country]}{m.net_amount} <span className="text-gray-500">{m.token}</span>
                      <span className="text-[10px] text-amber-400 ml-2">fee {COUNTRY_PREFIX[m.country]}{m.fee_amount}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      → {m.user_wallet.slice(0, 10)}…{m.user_wallet.slice(-6)}
                      {' · '}
                      ref: {m.bank_reference}
                    </p>
                  </div>
                  <a
                    href={explorerLink(m.user_tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline font-mono flex-shrink-0"
                  >
                    {shortHash(m.user_tx_hash)} ↗
                  </a>
                  <p className="text-[10px] text-gray-600 flex-shrink-0">
                    {new Date(m.created_at).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
