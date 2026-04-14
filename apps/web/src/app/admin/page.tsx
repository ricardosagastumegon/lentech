'use client';

import { useState } from 'react';
import {
  useAdminStore,
  BankConnectivity,
  BankStatusType,
  SystemFees,
  KYCLimits,
  TxLimits,
  UserOverride,
  UserStatus,
  UserTag,
} from '@/store/admin.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<BankStatusType, string> = {
  live:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  demo:     'bg-amber-100   text-amber-700   border-amber-200',
  offline:  'bg-red-100     text-red-700     border-red-200',
  degraded: 'bg-orange-100  text-orange-700  border-orange-200',
};
const STATUS_DOT: Record<BankStatusType, string> = {
  live:     'bg-emerald-500',
  demo:     'bg-amber-400',
  offline:  'bg-red-500',
  degraded: 'bg-orange-400',
};
const STATUS_LABEL: Record<BankStatusType, string> = {
  live: 'En vivo', demo: 'Demo', offline: 'Offline', degraded: 'Degradado',
};
const COUNTRY_FLAG: Record<string, string>  = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const COUNTRY_NAME: Record<string, string>  = { GT: 'Guatemala', MX: 'México', HN: 'Honduras' };
const PCT = (n: number) => `${(n * 100).toFixed(2)}%`;
const USD = (n: number) => n === 0 ? 'Sin límite' : `$${n.toLocaleString()} USD`;

type Tab = 'connectivity' | 'params' | 'fx' | 'users' | 'system';

const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  suspended: 'bg-amber-100   text-amber-700',
  blocked:   'bg-red-100     text-red-700',
};
const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Activo', suspended: 'Suspendido', blocked: 'Bloqueado',
};
const TAG_COLORS: Record<UserTag, string> = {
  vip:       'bg-yellow-100 text-yellow-700',
  corporate: 'bg-blue-100   text-blue-700',
  test:      'bg-gray-100   text-gray-500',
  flagged:   'bg-red-100    text-red-600',
  staff:     'bg-purple-100 text-purple-700',
};
const COUNTRY_FLAG2: Record<string, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const KYC_LABEL = ['Anónimo', 'Básico', 'Verificado', 'Corporativo'];
const USD2 = (n: number | null) => n === null ? '—' : n === 0 ? 'Sin límite' : `$${n.toLocaleString()}`;

// ─── User override modal ──────────────────────────────────────────────────────
function UserModal({
  initial, globalTx, onSave, onClose,
}: {
  initial: UserOverride | null;
  globalTx: TxLimits;
  onSave: (u: Omit<UserOverride, 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const isNew = !initial;
  const [userId,      setUserId]      = useState(initial?.userId      ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [phone,       setPhone]       = useState(initial?.phone       ?? '');
  const [country,     setCountry]     = useState(initial?.country     ?? 'GT');
  const [kycLevel,    setKycLevel]    = useState(initial?.kycLevel    ?? 1);
  const [status,      setStatus]      = useState<UserStatus>(initial?.status ?? 'active');
  const [tags,        setTags]        = useState<UserTag[]>(initial?.tags ?? []);
  const [maxSend,     setMaxSend]     = useState<string>(initial?.maxSendPerTxUSD?.toString()    ?? '');
  const [maxDaily,    setMaxDaily]    = useState<string>(initial?.maxSendDailyUSD?.toString()    ?? '');
  const [maxWith,     setMaxWith]     = useState<string>(initial?.maxWithdrawPerTxUSD?.toString() ?? '');
  const [monthly,     setMonthly]     = useState<string>(initial?.monthlyLimitUSD?.toString()    ?? '');
  const [customFee,   setCustomFee]   = useState<string>(
    initial?.customFeePercent != null ? (initial.customFeePercent * 100).toFixed(2) : ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function toggleTag(t: UserTag) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function nullOrNum(s: string) { const n = parseFloat(s); return isNaN(n) ? null : n; }

  function handleSave() {
    if (!userId.trim() || !displayName.trim()) return;
    const feeRaw = parseFloat(customFee);
    onSave({
      userId: userId.trim(),
      displayName: displayName.trim(),
      phone: phone.trim(),
      country,
      kycLevel,
      status,
      tags,
      maxSendPerTxUSD:     nullOrNum(maxSend),
      maxSendDailyUSD:     nullOrNum(maxDaily),
      maxWithdrawPerTxUSD: nullOrNum(maxWith),
      monthlyLimitUSD:     nullOrNum(monthly),
      customFeePercent:    isNaN(feeRaw) ? null : feeRaw / 100,
      notes,
    });
  }

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-len-purple transition-colors';
  const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <p className="font-black text-gray-900 text-lg">{isNew ? 'Agregar usuario' : 'Editar usuario'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Los campos de límite vacíos usan el parámetro global</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ID de usuario</label>
              <input className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}
                placeholder="uid-001 o demo-gt" disabled={!isNew} />
            </div>
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Carlos Mendoza" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+50211111111" />
            </div>
            <div>
              <label className={labelCls}>País</label>
              <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="GT">🇬🇹 Guatemala</option>
                <option value="MX">🇲🇽 México</option>
                <option value="HN">🇭🇳 Honduras</option>
              </select>
            </div>
          </div>

          {/* KYC + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nivel KYC</label>
              <select className={inputCls} value={kycLevel} onChange={e => setKycLevel(Number(e.target.value))}>
                {[0, 1, 2, 3].map(l => <option key={l} value={l}>Nivel {l} — {KYC_LABEL[l]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as UserStatus)}>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Etiquetas</label>
            <div className="flex flex-wrap gap-2">
              {(['vip', 'corporate', 'test', 'flagged', 'staff'] as UserTag[]).map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all
                    ${tags.includes(t) ? `${TAG_COLORS[t]} border-current` : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Limits override */}
          <div>
            <label className={labelCls}>Límites personalizados (USD) — vacío = usa global</label>
            <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Máx. por envío</p>
                <p className="text-[10px] text-gray-300 mb-1.5">Global: ${globalTx.maxSendPerTxUSD.toLocaleString()}</p>
                <input className={inputCls} type="number" value={maxSend}
                  onChange={e => setMaxSend(e.target.value)} placeholder="ej. 25000" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Límite diario envíos</p>
                <p className="text-[10px] text-gray-300 mb-1.5">Global: ${globalTx.maxSendDailyUSD.toLocaleString()}</p>
                <input className={inputCls} type="number" value={maxDaily}
                  onChange={e => setMaxDaily(e.target.value)} placeholder="ej. 50000" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Máx. por retiro</p>
                <p className="text-[10px] text-gray-300 mb-1.5">Global: ${globalTx.maxWithdrawPerTxUSD.toLocaleString()}</p>
                <input className={inputCls} type="number" value={maxWith}
                  onChange={e => setMaxWith(e.target.value)} placeholder="ej. 15000" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Límite mensual</p>
                <p className="text-[10px] text-gray-300 mb-1.5">Global: por KYC level</p>
                <input className={inputCls} type="number" value={monthly}
                  onChange={e => setMonthly(e.target.value)} placeholder="ej. 100000" />
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-gray-400 mb-1">Fee personalizado (%)</p>
                <p className="text-[10px] text-gray-300 mb-1.5">Global: usa fee estándar por tipo de tx</p>
                <input className={inputCls} type="number" step="0.01" value={customFee}
                  onChange={e => setCustomFee(e.target.value)} placeholder="ej. 0.20 para 0.20%" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexto, motivo del override, ticket de soporte..." />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!userId.trim() || !displayName.trim()}
            className="flex-1 py-3 rounded-2xl bg-len-gradient text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isNew ? 'Agregar usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login gate ───────────────────────────────────────────────────────────────
function LoginGate() {
  const login = useAdminStore(s => s.login);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  function attempt() {
    if (!login(pw)) {
      setErr(true);
      setTimeout(() => setErr(false), 1500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-len-gradient rounded-2xl flex items-center justify-center">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <div>
            <p className="text-white font-black text-lg">LEN Admin</p>
            <p className="text-gray-500 text-xs">Panel de operaciones</p>
          </div>
        </div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Contraseña de acceso
        </label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="••••••••"
          className={`w-full bg-gray-800 border-2 rounded-2xl px-4 py-3 text-white font-mono
            placeholder:text-gray-600 focus:outline-none transition-colors
            ${err ? 'border-red-500 animate-pulse' : 'border-gray-700 focus:border-len-purple'}`}
        />
        {err && <p className="text-red-400 text-xs mt-2 text-center">Contraseña incorrecta</p>}
        <button
          onClick={attempt}
          className="mt-4 w-full bg-len-gradient text-white font-bold rounded-2xl py-3 hover:opacity-90 transition-opacity"
        >
          Ingresar al panel →
        </button>
      </div>
    </div>
  );
}

// ─── Bank row ─────────────────────────────────────────────────────────────────
function BankRow({ bank }: { bank: BankConnectivity }) {
  const setBankStatus = useAdminStore(s => s.setBankStatus);
  const pingBank      = useAdminStore(s => s.pingBank);
  const [pinging, setPinging] = useState(false);

  function handlePing() {
    setPinging(true);
    pingBank(bank.code);
    setTimeout(() => setPinging(false), 600);
  }

  const nextStatus: Record<BankStatusType, BankStatusType> = {
    live: 'demo', demo: 'offline', offline: 'live', degraded: 'live',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[bank.status]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{bank.name}</p>
        <p className="text-[11px] text-gray-400 font-mono">{bank.protocol} · ACH {bank.achCode}</p>
      </div>
      {bank.status === 'live' && bank.pingMs > 0 && (
        <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">{bank.pingMs}ms</span>
      )}
      <button
        onClick={handlePing}
        disabled={bank.status !== 'live' || pinging}
        className="text-[10px] text-gray-400 hover:text-len-purple disabled:opacity-30 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-len-light"
      >
        {pinging ? '⟳' : 'ping'}
      </button>
      <button
        onClick={() => setBankStatus(bank.code, nextStatus[bank.status])}
        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${STATUS_COLORS[bank.status]}`}
      >
        {STATUS_LABEL[bank.status]}
      </button>
    </div>
  );
}

// ─── Editable number row ──────────────────────────────────────────────────────
function ParamRow({
  label, hint, value, onChange, format = 'number', min = 0, max = 1, step = 1,
}: {
  label: string; hint?: string; value: number;
  onChange: (n: number) => void;
  format?: 'pct' | 'usd' | 'number';
  min?: number; max?: number; step?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw]         = useState('');

  function startEdit() {
    const display = format === 'pct'
      ? (value * 100).toFixed(2)
      : value.toString();
    setRaw(display);
    setEditing(true);
  }

  function commit() {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const actual = format === 'pct' ? n / 100 : n;
      onChange(Math.max(min, Math.min(max, actual)));
    }
    setEditing(false);
  }

  const display = format === 'pct' ? PCT(value)
    : format === 'usd' ? USD(value)
    : value.toString();

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {editing ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            autoFocus
            type="number"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-28 text-right border-2 border-len-purple rounded-xl px-3 py-1.5 text-sm font-mono
                       text-len-dark focus:outline-none"
          />
          {format === 'pct' && <span className="text-xs text-gray-400">%</span>}
          {format === 'usd' && <span className="text-xs text-gray-400">USD</span>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="text-sm font-black text-len-purple tabular-nums flex-shrink-0 px-3 py-1.5
                     rounded-xl bg-len-light hover:bg-len-border transition-colors"
        >
          {display}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const {
    isAuthenticated, logout,
    liveMode, maintenanceMode, toggleLiveMode, toggleMaintenance,
    banks, pingAllBanks,
    fees, setFees,
    kycLimits, setKYCLimits,
    txLimits, setTxLimits,
    fxOverrides, setFXOverride,
    userOverrides, upsertUserOverride, setUserStatus, removeUserOverride,
  } = useAdminStore();

  const [tab,        setTab]        = useState<Tab>('connectivity');
  const [pingingAll, setPingingAll] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserOverride | null | 'new'>('new' as unknown as null);
  const [showUserModal, setShowUserModal] = useState(false);

  if (!isAuthenticated) return <LoginGate />;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const countryBanks = (country: 'GT' | 'MX' | 'HN') =>
    banks.filter(b => b.country === country);

  const liveBanks = banks.filter(b => b.status === 'live').length;
  const demoBanks = banks.filter(b => b.status === 'demo').length;
  const offlineBanks = banks.filter(b => b.status === 'offline' || b.status === 'degraded').length;

  function handlePingAll() {
    setPingingAll(true);
    pingAllBanks();
    setTimeout(() => setPingingAll(false), 800);
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'connectivity', label: 'Conectividad', icon: '🔗' },
    { key: 'params',       label: 'Parámetros',   icon: '⚙️' },
    { key: 'fx',           label: 'Tipos FX',     icon: '💱' },
    { key: 'users',        label: 'Usuarios',     icon: '👤' },
    { key: 'system',       label: 'Sistema',      icon: '🖥' },
  ];

  const filteredUsers = userOverrides.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.displayName.toLowerCase().includes(q) || u.phone.includes(q) || u.userId.includes(q);
  });

  return (
    <>
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-len-gradient rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">L</span>
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none">LEN Admin</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Panel de operaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border
            ${liveMode
              ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800'
              : 'bg-amber-900/40 text-amber-400 border-amber-800'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {liveMode ? 'En vivo' : 'Demo'}
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
            Salir
          </button>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2 flex items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400">{liveBanks} en vivo</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-400">{demoBanks} demo</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-400">{offlineBanks} offline</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-gray-600 flex-shrink-0">
          {new Date().toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-800 px-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px
              ${tab === t.key
                ? 'border-len-purple text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ══ TAB: Connectivity ══ */}
        {tab === 'connectivity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Conectividad bancaria</h2>
                <p className="text-gray-500 text-sm">{banks.length} bancos · 3 redes de pago</p>
              </div>
              <button
                onClick={handlePingAll}
                disabled={pingingAll}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-2xl
                           text-xs font-bold text-gray-300 transition-colors disabled:opacity-50"
              >
                <span className={pingingAll ? 'animate-spin' : ''}>⟳</span>
                Ping todos
              </button>
            </div>

            {(['GT', 'MX', 'HN'] as const).map(country => {
              const cb = countryBanks(country);
              const cLive = cb.filter(b => b.status === 'live').length;
              return (
                <div key={country} className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                  {/* Country header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{COUNTRY_FLAG[country]}</span>
                      <div>
                        <p className="font-black text-white">{COUNTRY_NAME[country]}</p>
                        <p className="text-xs text-gray-500">
                          {country === 'GT' ? 'ACH BANGUAT via Banrural' : country === 'MX' ? 'SPEI via STP / Conekta' : 'SIEFOM via BAC'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border
                      ${cLive > 0
                        ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800'
                        : 'bg-amber-900/40 text-amber-400 border-amber-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cLive > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {cLive}/{cb.length} activos
                    </div>
                  </div>
                  {/* Bank list */}
                  <div className="px-5 bg-white">
                    {cb.map(b => <BankRow key={b.code} bank={b} />)}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Leyenda</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> En vivo — conectado a red real</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Demo — simulado localmente</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Offline — sin conexión</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400" /> Degradado — lentitud / errores parciales</div>
              </div>
              <p className="text-[11px] text-gray-600 mt-3">
                Clic en el badge de estado para cambiar entre Live → Demo → Offline → Live.
                El ping actualiza la latencia de bancos en vivo.
              </p>
            </div>
          </div>
        )}

        {/* ══ TAB: Parameters ══ */}
        {tab === 'params' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Parámetros del sistema</h2>
              <p className="text-gray-500 text-sm">Clic en cualquier valor para editarlo. Guardado automático.</p>
            </div>

            {/* Fees */}
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-black text-gray-800 text-sm">Comisiones</p>
                <p className="text-xs text-gray-400">Las comisiones se aplican al monto de origen</p>
              </div>
              <div className="px-5">
                <ParamRow
                  label="Compra de tokens" hint="Usuario deposita fiat → recibe tokens"
                  value={fees.tokenBuy} format="pct" min={0} max={0.05}
                  onChange={v => setFees({ tokenBuy: v })}
                />
                <ParamRow
                  label="Venta de tokens" hint="Usuario vende tokens → recibe fiat"
                  value={fees.tokenSell} format="pct" min={0} max={0.05}
                  onChange={v => setFees({ tokenSell: v })}
                />
                <ParamRow
                  label="FX Mesoamérica" hint="Envíos GT↔HN↔CR↔NI↔SV↔BZ"
                  value={fees.fxMesoamerica} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ fxMesoamerica: v })}
                />
                <ParamRow
                  label="FX con México" hint="Envíos GT/HN↔MX o MX↔otros"
                  value={fees.fxMexico} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ fxMexico: v })}
                />
                <ParamRow
                  label="FX cross-region" hint="Envíos fuera de Mesoamérica"
                  value={fees.fxCrossRegion} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ fxCrossRegion: v })}
                />
                <ParamRow
                  label="Retiro bancario GT" hint="GTQ → ACH BANGUAT"
                  value={fees.withdrawGT} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ withdrawGT: v })}
                />
                <ParamRow
                  label="Retiro bancario MX" hint="MXN → SPEI"
                  value={fees.withdrawMX} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ withdrawMX: v })}
                />
                <ParamRow
                  label="Retiro bancario HN" hint="HNL → SIEFOM"
                  value={fees.withdrawHN} format="pct" min={0} max={0.02}
                  onChange={v => setFees({ withdrawHN: v })}
                />
              </div>
            </div>

            {/* KYC limits */}
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-black text-gray-800 text-sm">Límites KYC (mensual en USD)</p>
                <p className="text-xs text-gray-400">0 = sin límite (aplica solo a nivel 3 corporativo)</p>
              </div>
              <div className="px-5">
                <ParamRow
                  label="KYC Nivel 0 — Anónimo" hint="Sin verificación"
                  value={kycLimits.level0MonthlyUSD} format="usd" min={0} max={10000}
                  onChange={v => setKYCLimits({ level0MonthlyUSD: v })}
                />
                <ParamRow
                  label="KYC Nivel 1 — Básico" hint="Teléfono + email verificado"
                  value={kycLimits.level1MonthlyUSD} format="usd" min={0} max={50000}
                  onChange={v => setKYCLimits({ level1MonthlyUSD: v })}
                />
                <ParamRow
                  label="KYC Nivel 2 — Verificado" hint="DPI / INE + selfie"
                  value={kycLimits.level2MonthlyUSD} format="usd" min={0} max={500000}
                  onChange={v => setKYCLimits({ level2MonthlyUSD: v })}
                />
                <ParamRow
                  label="KYC Nivel 3 — Corporativo" hint="Empresa + due diligence"
                  value={kycLimits.level3MonthlyUSD} format="usd" min={0} max={0}
                  onChange={v => setKYCLimits({ level3MonthlyUSD: v })}
                />
              </div>
            </div>

            {/* Transaction limits */}
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-black text-gray-800 text-sm">Límites por transacción (USD)</p>
              </div>
              <div className="px-5">
                <ParamRow label="Monto mínimo de envío"    value={txLimits.minSendUSD}          format="usd" min={0} max={1000}   onChange={v => setTxLimits({ minSendUSD: v })} />
                <ParamRow label="Monto máximo por envío"   value={txLimits.maxSendPerTxUSD}     format="usd" min={0} max={100000} onChange={v => setTxLimits({ maxSendPerTxUSD: v })} />
                <ParamRow label="Límite diario de envíos"  value={txLimits.maxSendDailyUSD}     format="usd" min={0} max={500000} onChange={v => setTxLimits({ maxSendDailyUSD: v })} />
                <ParamRow label="Mínimo de retiro"         value={txLimits.minWithdrawUSD}      format="usd" min={0} max={1000}   onChange={v => setTxLimits({ minWithdrawUSD: v })} />
                <ParamRow label="Máximo por retiro"        value={txLimits.maxWithdrawPerTxUSD} format="usd" min={0} max={100000} onChange={v => setTxLimits({ maxWithdrawPerTxUSD: v })} />
                <ParamRow label="Mínimo compra de tokens"  value={txLimits.minBuyTokensUSD}     format="usd" min={0} max={1000}   onChange={v => setTxLimits({ minBuyTokensUSD: v })} />
                <ParamRow label="Máximo compra de tokens"  value={txLimits.maxBuyTokensUSD}     format="usd" min={0} max={500000} onChange={v => setTxLimits({ maxBuyTokensUSD: v })} />
                <ParamRow label="Mínimo venta de tokens"   value={txLimits.minSellTokensUSD}    format="usd" min={0} max={1000}   onChange={v => setTxLimits({ minSellTokensUSD: v })} />
                <ParamRow label="Máximo venta de tokens"   value={txLimits.maxSellTokensUSD}    format="usd" min={0} max={500000} onChange={v => setTxLimits({ maxSellTokensUSD: v })} />
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: FX Rates ══ */}
        {tab === 'fx' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Tipos de cambio FX</h2>
              <p className="text-gray-500 text-sm">
                En producción los rates vienen de Chainlink + Open Exchange Rates.
                Activa el override para fijar un rate manualmente.
              </p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 grid grid-cols-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Moneda</span>
                <span className="text-right">Tasa USD</span>
                <span className="text-right">Equivalencia</span>
                <span className="text-right">Override</span>
              </div>
              {fxOverrides.map(fx => (
                <div key={fx.coin} className={`grid grid-cols-4 items-center px-5 py-4 border-b border-gray-100 last:border-0 ${fx.enabled ? 'bg-amber-50' : ''}`}>
                  <div>
                    <p className="font-black text-gray-800 text-sm">{fx.coin}</p>
                    {fx.enabled && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Override</span>
                    )}
                  </div>
                  <div className="text-right">
                    {fx.enabled ? (
                      <input
                        type="number"
                        value={fx.usdRate}
                        onChange={e => setFXOverride(fx.coin, parseFloat(e.target.value) || 0, fx.enabled)}
                        className="w-28 text-right border-2 border-len-purple rounded-xl px-2 py-1 text-sm font-mono text-len-dark focus:outline-none"
                        step="0.00001"
                      />
                    ) : (
                      <span className="font-mono text-sm text-gray-800">{fx.usdRate.toFixed(5)}</span>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500 font-mono">
                    {fx.usdRate > 0 ? `1 USD = ${(1 / fx.usdRate).toFixed(2)} ${fx.coin}` : '—'}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setFXOverride(fx.coin, fx.usdRate, !fx.enabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${fx.enabled ? 'bg-amber-400' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${fx.enabled ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4 text-xs text-gray-500 space-y-1">
              <p className="font-bold text-gray-400">Fuentes de datos en producción:</p>
              <p>• <span className="text-gray-300">Chainlink Price Feeds</span> — on-chain, immutable, 30-min heartbeat</p>
              <p>• <span className="text-gray-300">Open Exchange Rates API</span> — fallback primario, actualización cada 5 min</p>
              <p>• <span className="text-gray-300">Fixer.io</span> — fallback secundario</p>
              <p>• <span className="text-gray-300">Override manual</span> — solo para emergencias o mantenimiento de mercado</p>
            </div>
          </div>
        )}

        {/* ══ TAB: Usuarios ══ */}
        {tab === 'users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Gestión de usuarios</h2>
                <p className="text-gray-500 text-sm">{userOverrides.length} usuarios · overrides y soporte</p>
              </div>
              <button
                onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-len-purple text-white rounded-2xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                + Agregar usuario
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o ID..."
                className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-len-purple transition-colors"
              />
            </div>

            {/* User cards */}
            <div className="space-y-3">
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="font-bold">Sin usuarios</p>
                  <p className="text-sm mt-1">Agrega el primero con el botón de arriba</p>
                </div>
              )}
              {filteredUsers.map(u => (
                <div key={u.userId} className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                  {/* User header */}
                  <div className="px-5 py-4 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-len-gradient rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0">
                      {u.displayName[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white text-sm">{u.displayName}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${USER_STATUS_COLORS[u.status]}`}>
                          {USER_STATUS_LABEL[u.status]}
                        </span>
                        {u.tags.map(t => (
                          <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[t]}`}>
                            {t.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{u.phone} · {COUNTRY_FLAG2[u.country] ?? u.country} · KYC {u.kycLevel} {KYC_LABEL[u.kycLevel]}</p>
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5">{u.userId}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* Overrides summary */}
                  <div className="border-t border-gray-800 px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Máx. envío/tx</span>
                      <span className={`font-mono font-bold ${u.maxSendPerTxUSD !== null ? 'text-amber-400' : 'text-gray-600'}`}>
                        {u.maxSendPerTxUSD !== null ? `$${u.maxSendPerTxUSD.toLocaleString()}` : `global ($${txLimits.maxSendPerTxUSD.toLocaleString()})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Límite diario</span>
                      <span className={`font-mono font-bold ${u.maxSendDailyUSD !== null ? 'text-amber-400' : 'text-gray-600'}`}>
                        {u.maxSendDailyUSD !== null ? `$${u.maxSendDailyUSD.toLocaleString()}` : `global ($${txLimits.maxSendDailyUSD.toLocaleString()})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Máx. retiro/tx</span>
                      <span className={`font-mono font-bold ${u.maxWithdrawPerTxUSD !== null ? 'text-amber-400' : 'text-gray-600'}`}>
                        {u.maxWithdrawPerTxUSD !== null ? `$${u.maxWithdrawPerTxUSD.toLocaleString()}` : `global ($${txLimits.maxWithdrawPerTxUSD.toLocaleString()})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mensual</span>
                      <span className={`font-mono font-bold ${u.monthlyLimitUSD !== null ? 'text-amber-400' : 'text-gray-600'}`}>
                        {USD2(u.monthlyLimitUSD) !== '—' ? USD2(u.monthlyLimitUSD) : 'global'}
                      </span>
                    </div>
                    {u.customFeePercent !== null && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-600">Fee personalizado</span>
                        <span className="font-mono font-bold text-amber-400">{(u.customFeePercent * 100).toFixed(2)}%</span>
                      </div>
                    )}
                    {u.notes && (
                      <div className="col-span-2 mt-1 pt-2 border-t border-gray-800">
                        <p className="text-gray-500 text-[11px]">📝 {u.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Quick action bar */}
                  <div className="border-t border-gray-800 px-5 py-3 flex items-center gap-2">
                    <p className="text-[11px] text-gray-600 flex-1">
                      Actualizado {new Date(u.updatedAt).toLocaleDateString('es-GT')}
                    </p>
                    {u.status === 'active' && (
                      <button
                        onClick={() => setUserStatus(u.userId, 'suspended')}
                        className="px-3 py-1 bg-amber-900/40 text-amber-400 border border-amber-800 text-[11px] font-bold rounded-xl hover:bg-amber-900/60 transition-colors"
                      >
                        Suspender
                      </button>
                    )}
                    {u.status === 'suspended' && (
                      <>
                        <button
                          onClick={() => setUserStatus(u.userId, 'active')}
                          className="px-3 py-1 bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-[11px] font-bold rounded-xl hover:bg-emerald-900/60 transition-colors"
                        >
                          Reactivar
                        </button>
                        <button
                          onClick={() => setUserStatus(u.userId, 'blocked')}
                          className="px-3 py-1 bg-red-900/40 text-red-400 border border-red-800 text-[11px] font-bold rounded-xl hover:bg-red-900/60 transition-colors"
                        >
                          Bloquear
                        </button>
                      </>
                    )}
                    {u.status === 'blocked' && (
                      <button
                        onClick={() => setUserStatus(u.userId, 'active')}
                        className="px-3 py-1 bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-[11px] font-bold rounded-xl hover:bg-emerald-900/60 transition-colors"
                      >
                        Desbloquear
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('¿Eliminar override de este usuario?')) removeUserOverride(u.userId); }}
                      className="px-3 py-1 text-gray-600 text-[11px] font-bold rounded-xl hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Info box */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4 text-xs text-gray-500 space-y-1.5">
              <p className="font-bold text-gray-400">¿Cómo funcionan los overrides?</p>
              <p>• Los valores en <span className="text-amber-400 font-bold">amarillo</span> son overrides activos — reemplazan el parámetro global para ese usuario</p>
              <p>• Los valores en gris dicen "global" — el usuario usa el mismo límite que todos</p>
              <p>• Puedes subir límites (clientes VIP, corporativos) o bajarlos (usuarios en revisión)</p>
              <p>• El fee personalizado aplica a TODAS las transacciones de ese usuario si está configurado</p>
              <p>• Suspender bloquea operaciones temporalmente. Bloquear es permanente hasta reactivación manual.</p>
            </div>
          </div>
        )}

        {/* ══ TAB: System ══ */}
        {tab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Estado del sistema</h2>
              <p className="text-gray-500 text-sm">Controles globales y estado de servicios</p>
            </div>

            {/* Global toggles */}
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-black text-gray-800 text-sm">Controles globales</p>
              </div>
              <div className="px-5 divide-y divide-gray-100">
                {/* Live / Demo toggle */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Modo de operación</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {liveMode
                        ? 'En vivo — transacciones reales con bancos'
                        : 'Demo — todas las operaciones son simuladas'}
                    </p>
                  </div>
                  <button
                    onClick={toggleLiveMode}
                    className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${liveMode ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${liveMode ? 'translate-x-7' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Maintenance mode */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Modo mantenimiento</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {maintenanceMode
                        ? 'Activo — usuarios ven pantalla de mantenimiento'
                        : 'Inactivo — app disponible normalmente'}
                    </p>
                  </div>
                  <button
                    onClick={toggleMaintenance}
                    className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${maintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${maintenanceMode ? 'translate-x-7' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-black text-gray-800 text-sm">Servicios internos</p>
              </div>
              <div className="px-5 divide-y divide-gray-100">
                {[
                  { name: 'API Gateway',        status: 'live', note: 'Railway — web-production-1c372', ping: '45ms' },
                  { name: 'Firestore (DB)',      status: 'live', note: 'lentech-216a0 · nam5', ping: '28ms' },
                  { name: 'Auth Service',        status: 'live', note: 'Firebase Auth', ping: '32ms' },
                  { name: 'FX Engine',           status: liveMode ? 'live' : 'demo', note: liveMode ? 'Puerto 3003' : 'Rates estáticos', ping: liveMode ? '12ms' : '—' },
                  { name: 'Push Notifications',  status: 'live', note: 'Firebase Cloud Messaging', ping: '67ms' },
                  { name: 'KYC Provider',        status: 'demo', note: 'Jumio / Onfido — pendiente contrato', ping: '—' },
                  { name: 'Banco Central API',   status: 'demo', note: 'BANGUAT / Banxico / BCH', ping: '—' },
                ].map(svc => (
                  <div key={svc.name} className="flex items-center gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
                      ${svc.status === 'live' ? 'bg-emerald-500 animate-pulse' : svc.status === 'demo' ? 'bg-amber-400' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{svc.name}</p>
                      <p className="text-[11px] text-gray-400">{svc.note}</p>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">{svc.ping}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                      ${svc.status === 'live' ? 'bg-emerald-100 text-emerald-700' : svc.status === 'demo' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {svc.status === 'live' ? 'Activo' : svc.status === 'demo' ? 'Demo' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen conectividad */}
            <div className="grid grid-cols-3 gap-3">
              {(['GT', 'MX', 'HN'] as const).map(c => {
                const cb = countryBanks(c);
                const n  = cb.filter(b => b.status === 'live').length;
                return (
                  <div key={c} className={`bg-gray-900 rounded-2xl border px-4 py-4 text-center
                    ${n > 0 ? 'border-emerald-800' : 'border-amber-800'}`}>
                    <span className="text-2xl">{COUNTRY_FLAG[c]}</span>
                    <p className={`text-xl font-black mt-1 ${n > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {n}/{cb.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">bancos activos</p>
                  </div>
                );
              })}
            </div>

            {/* Config info */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 px-5 py-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumen de parámetros actuales</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Compra tokens</span>
                  <span className="text-white font-mono">{PCT(fees.tokenBuy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Venta tokens</span>
                  <span className="text-white font-mono">{PCT(fees.tokenSell)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">FX Mesoamérica</span>
                  <span className="text-white font-mono">{PCT(fees.fxMesoamerica)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">FX México</span>
                  <span className="text-white font-mono">{PCT(fees.fxMexico)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Límite KYC-2</span>
                  <span className="text-white font-mono">${kycLimits.level2MonthlyUSD.toLocaleString()}/mes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Máx. por envío</span>
                  <span className="text-white font-mono">${txLimits.maxSendPerTxUSD.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── User modal ── */}
    {showUserModal && (
      <UserModal
        initial={editingUser as UserOverride | null}
        globalTx={txLimits}
        onSave={(data) => {
          upsertUserOverride(data);
          setShowUserModal(false);
        }}
        onClose={() => setShowUserModal(false)}
      />
    )}
  </>
  );
}
