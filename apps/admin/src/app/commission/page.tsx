'use client';

/**
 * Comisiones — admin panel
 *
 * Permite editar % de comisión por operación/país y agregar/quitar
 * beneficiarios (splits) con sus wallets en Celo.
 */

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/admin.store';

const API_BASE = process.env.NEXT_PUBLIC_LEN_API_URL ?? 'https://web-production-1c372.up.railway.app';

const COUNTRY_FLAG: Record<string, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const COUNTRY_PREFIX: Record<string, string> = { GT: 'Q', MX: '$', HN: 'L' };
const OPERATION_LABEL: Record<string, string> = {
  deposit:    'Depósito (mint)',
  withdrawal: 'Retiro (burn)',
  transfer:   'Transferencia P2P',
  card_spend: 'Gasto con tarjeta',
};

interface Split {
  recipient_id: string;
  name:         string;
  percent:      number;
  wallet_celo:  string;
  active:       boolean;
}

interface Rule {
  rule_id:     string;
  operation:   string;
  country:     'MX' | 'GT' | 'HN';
  fee_percent: number;
  fee_min:     number;
  fee_max:     number;
  splits:      Split[];
  active:      boolean;
}

export default function CommissionPage() {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);

  const [apiKey,       setApiKey]       = useState('');
  const [apiKeySaved,  setApiKeySaved]  = useState(false);
  const [rules,        setRules]        = useState<Rule[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [editing,      setEditing]      = useState<Rule | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('len_admin_api_key');
    if (saved) { setApiKey(saved); setApiKeySaved(true); }
  }, []);

  async function loadRules() {
    if (!apiKeySaved) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/commission`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const j = await res.json();
      if (j.ok) setRules(j.data);
      else setError(j.error ?? 'Error cargando reglas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (apiKeySaved) loadRules();
  }, [apiKeySaved]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveApiKey() {
    if (apiKey.length < 32) { setError('API key mínima 32 caracteres'); return; }
    localStorage.setItem('len_admin_api_key', apiKey);
    setApiKeySaved(true);
    setError('');
  }

  async function saveRule() {
    if (!editing) return;
    const total = editing.splits.filter(s => s.active).reduce((s, x) => s + x.percent, 0);
    if (Math.abs(total - 100) > 0.01) {
      setError(`Splits activos deben sumar 100% (suma actual: ${total})`);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/commission`, {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          rule_id:    editing.rule_id,
          updates: {
            fee_percent: editing.fee_percent,
            fee_min:     editing.fee_min,
            fee_max:     editing.fee_max,
            splits:      editing.splits,
            active:      editing.active,
          },
          admin_user: 'admin',
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? 'Error guardando');
      } else {
        setSuccess(`Regla ${editing.rule_id} actualizada`);
        setEditing(null);
        loadRules();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setSaving(false);
    }
  }

  function addSplit() {
    if (!editing) return;
    setEditing({
      ...editing,
      splits: [
        ...editing.splits,
        { recipient_id: `recipient_${Date.now()}`, name: 'Nuevo beneficiario', percent: 0, wallet_celo: '', active: true },
      ],
    });
  }

  function updateSplit(idx: number, updates: Partial<Split>) {
    if (!editing) return;
    const splits = [...editing.splits];
    splits[idx] = { ...splits[idx], ...updates };
    setEditing({ ...editing, splits });
  }

  function removeSplit(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, splits: editing.splits.filter((_, i) => i !== idx) });
  }

  if (!isAuthenticated) {
    return <div className="text-white p-6">Inicia sesión en el panel admin primero.</div>;
  }

  if (!apiKeySaved) {
    return (
      <div className="bg-gray-900 border border-amber-700/50 rounded-2xl p-5 space-y-3 max-w-md">
        <p className="text-amber-400 font-bold text-sm">⚠️ Configurar API key admin</p>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="LEN_ADMIN_API_KEY"
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono"
        />
        <button onClick={saveApiKey} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-sm">
          Guardar
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Comisiones</h1>
        <p className="text-gray-500 text-sm mt-1">
          Edita el % por operación/país y configura beneficiarios (splits)
        </p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-2xl p-3 text-sm text-red-300">⚠ {error}</div>
      )}
      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-3 text-sm text-emerald-300">✓ {success}</div>
      )}

      {/* Rules grid */}
      {loading && !rules.length && (
        <div className="text-center text-gray-500 py-8">Cargando reglas…</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rules.map(r => {
          const totalSplits = r.splits.filter(s => s.active).reduce((sum, s) => sum + s.percent, 0);
          return (
            <div key={r.rule_id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="bg-gray-950 px-4 py-3 flex items-center justify-between border-b border-gray-800">
                <div>
                  <p className="text-white font-bold text-sm">
                    {COUNTRY_FLAG[r.country]} {OPERATION_LABEL[r.operation] ?? r.operation}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">{r.rule_id}</p>
                </div>
                <button
                  onClick={() => setEditing(r)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl"
                >
                  Editar
                </button>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Comisión</span>
                  <span className="text-white font-mono font-bold">{r.fee_percent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Mín. / Máx.</span>
                  <span className="text-gray-400 font-mono">
                    {COUNTRY_PREFIX[r.country]}{r.fee_min.toFixed(2)} / {r.fee_max > 0 ? `${COUNTRY_PREFIX[r.country]}${r.fee_max.toFixed(2)}` : '∞'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1">Beneficiarios ({r.splits.filter(s => s.active).length} activos · {totalSplits}%)</p>
                  {r.splits.filter(s => s.active).map(s => (
                    <div key={s.recipient_id} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-300">{s.name}</span>
                      <span className="text-amber-400 font-mono">{s.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-950 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">
                  Editar — {COUNTRY_FLAG[editing.country]} {OPERATION_LABEL[editing.operation]}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">{editing.rule_id}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Fee % */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  % Comisión
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={editing.fee_percent}
                  onChange={e => setEditing({ ...editing, fee_percent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                />
              </div>

              {/* Min/Max */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Mín. ({COUNTRY_PREFIX[editing.country]})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.fee_min}
                    onChange={e => setEditing({ ...editing, fee_min: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Máx. ({COUNTRY_PREFIX[editing.country]}) — 0 = sin tope
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.fee_max}
                    onChange={e => setEditing({ ...editing, fee_max: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Splits */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Beneficiarios (suma activos debe ser 100%)
                  </label>
                  <button
                    onClick={addSplit}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {editing.splits.map((s, i) => (
                    <div key={i} className="bg-gray-800 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={s.name}
                          onChange={e => updateSplit(i, { name: e.target.value })}
                          placeholder="Nombre"
                          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={s.percent}
                          onChange={e => updateSplit(i, { percent: parseFloat(e.target.value) || 0 })}
                          className="w-20 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono text-right"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        <button
                          onClick={() => updateSplit(i, { active: !s.active })}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${s.active ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-700 text-gray-400'}`}
                        >
                          {s.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => removeSplit(i)}
                          className="text-red-500 hover:bg-red-900/30 px-2 py-1 rounded-lg text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={s.wallet_celo}
                        onChange={e => updateSplit(i, { wallet_celo: e.target.value })}
                        placeholder="Wallet Celo (0x...) — vacío = no se mintea la parte de fee"
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-gray-500 mt-2">
                  Suma activos: <span className={editing.splits.filter(s => s.active).reduce((sum, s) => sum + s.percent, 0) === 100 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {editing.splits.filter(s => s.active).reduce((sum, s) => sum + s.percent, 0).toFixed(2)}%
                  </span>
                </p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={e => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-sm text-white">Regla activa</span>
              </label>
            </div>

            <div className="border-t border-gray-800 px-5 py-4 flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-700 text-gray-300 font-bold text-sm hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm"
              >
                {saving ? '⟳ Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
