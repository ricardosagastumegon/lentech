'use client';

/**
 * Gestión de Accesos — admin panel
 *
 * CRUD de usuarios LEN (Firestore len_users):
 *   • Crear usuario con phone + PIN (hasheado con scrypt)
 *   • Listar todos con filtros
 *   • Resetear PIN
 *   • Suspender / Reactivar
 *   • Soft-delete (status = "deleted")
 *
 * No expone pin_hash en ningún lugar — sólo se setea/resetea.
 */

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/admin.store';

const API_BASE = process.env.NEXT_PUBLIC_LEN_API_URL ?? 'https://web-production-1c372.up.railway.app';

const COUNTRY_FLAG: Record<string, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };
const STATUS_LABEL: Record<string, string> = {
  active:    '✓ Activo',
  suspended: '⏸ Suspendido',
  deleted:   '✕ Eliminado',
};
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  suspended: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  deleted:   'bg-red-900/40 text-red-300 border-red-700/50',
};

interface User {
  user_id:              string;
  phone:                string;
  display_name:         string;
  country:              'MX' | 'GT' | 'HN';
  role:                 'user' | 'admin';
  status:               'active' | 'suspended' | 'deleted';
  celo_address?:        string;
  conduit_customer_id?: string;
  created_at:           string;
  last_login_at?:       string;
}

interface NewUser {
  phone:        string;
  display_name: string;
  country:      'MX' | 'GT' | 'HN';
  pin:          string;
  celo_address: string;
}

export default function AccessPage() {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);

  // ── Auth gate ───────────────────────────────────────────────────────────
  const [apiKey,      setApiKey]      = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // ── State ───────────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState<User[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'deleted'>('all');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newUser,    setNewUser]    = useState<NewUser>({
    phone: '', display_name: '', country: 'GT', pin: '', celo_address: '',
  });

  // PIN reset modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPin,    setNewPin]    = useState('');

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('len_admin_api_key');
    if (saved) { setApiKey(saved); setApiKeySaved(true); }
  }, []);

  useEffect(() => {
    if (apiKeySaved) loadUsers();
  }, [apiKeySaved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────
  function saveApiKey() {
    if (apiKey.length < 32) { setError('API key mínima 32 caracteres'); return; }
    localStorage.setItem('len_admin_api_key', apiKey);
    setApiKeySaved(true);
    setError('');
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const j = await res.json();
      if (j.ok) setUsers(j.data);
      else setError(j.error ?? 'Error cargando usuarios');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    setError(''); setSuccess('');
    if (!newUser.phone || !newUser.display_name || !newUser.pin) {
      setError('Llena todos los campos requeridos'); return;
    }
    if (newUser.pin.length < 6) { setError('PIN mínimo 6 caracteres'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(newUser),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error ?? 'Error creando usuario'); return; }
      setSuccess(`Usuario ${j.data.display_name} creado (id: ${j.data.user_id})`);
      setShowCreate(false);
      setNewUser({ phone: '', display_name: '', country: 'GT', pin: '', celo_address: '' });
      loadUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    }
  }

  async function updateStatus(userId: string, status: 'active' | 'suspended') {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?id=${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error ?? 'Error'); return; }
      setSuccess(`Estado actualizado a "${status}"`);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm(`¿Eliminar usuario ${userId}? (soft-delete, recuperable)`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error ?? 'Error'); return; }
      setSuccess(`Usuario eliminado`);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    }
  }

  async function doResetPin() {
    if (!resetUser || newPin.length < 6) { setError('PIN mínimo 6 caracteres'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/reset-pin`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ user_id: resetUser.user_id, new_pin: newPin }),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error ?? 'Error'); return; }
      setSuccess(`PIN reseteado para ${resetUser.display_name}`);
      setResetUser(null);
      setNewPin('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) return <div className="text-white p-6">Inicia sesión en el panel admin primero.</div>;

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

  const filtered = filterStatus === 'all' ? users : users.filter(u => u.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Gestión de Accesos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} usuario(s) — PIN hasheado con scrypt
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          + Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-2xl p-3 text-sm text-red-300">⚠ {error}</div>
      )}
      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-3 text-sm text-emerald-300">✓ {success}</div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'suspended', 'deleted'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors
              ${filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
        <button
          onClick={loadUsers}
          disabled={loading}
          className="ml-auto text-xs text-gray-400 hover:text-indigo-400"
        >
          {loading ? '⟳ cargando' : '↻ refrescar'}
        </button>
      </div>

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-800 bg-gray-950 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Usuario</div>
          <div className="col-span-2">País</div>
          <div className="col-span-2">Teléfono</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-12">
            {loading ? 'Cargando…' : 'Sin usuarios todavía'}
          </p>
        )}
        {filtered.map(u => (
          <div key={u.user_id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 items-center">
            <div className="col-span-3">
              <p className="text-white text-sm font-bold">{u.display_name}</p>
              <p className="text-[10px] text-gray-500 font-mono">{u.user_id}</p>
            </div>
            <div className="col-span-2 text-sm">
              <span className="text-xl">{COUNTRY_FLAG[u.country]}</span>
              <span className="text-gray-400 ml-2">{u.country}</span>
            </div>
            <div className="col-span-2 text-sm text-gray-300 font-mono">{u.phone}</div>
            <div className="col-span-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${STATUS_COLOR[u.status]}`}>
                {STATUS_LABEL[u.status]}
              </span>
              {u.role === 'admin' && (
                <span className="text-[10px] bg-purple-900/50 text-purple-300 ml-1 px-2 py-1 rounded-lg border border-purple-700/50">admin</span>
              )}
            </div>
            <div className="col-span-3 flex gap-1 justify-end">
              <button
                onClick={() => setResetUser(u)}
                className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg"
                title="Resetear PIN"
              >
                🔑 PIN
              </button>
              {u.status === 'active' && (
                <button
                  onClick={() => updateStatus(u.user_id, 'suspended')}
                  className="text-[10px] bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 px-2 py-1 rounded-lg"
                >
                  ⏸ Suspender
                </button>
              )}
              {u.status === 'suspended' && (
                <button
                  onClick={() => updateStatus(u.user_id, 'active')}
                  className="text-[10px] bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 px-2 py-1 rounded-lg"
                >
                  ▶ Reactivar
                </button>
              )}
              {u.status !== 'deleted' && (
                <button
                  onClick={() => deleteUser(u.user_id)}
                  className="text-[10px] bg-red-900/40 hover:bg-red-900/60 text-red-300 px-2 py-1 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-md w-full">
            <div className="bg-gray-950 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <p className="text-white font-bold">Nuevo usuario</p>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={newUser.display_name}
                  onChange={e => setNewUser({ ...newUser, display_name: e.target.value })}
                  placeholder="Carlos Mendoza"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">País</label>
                  <select
                    value={newUser.country}
                    onChange={e => setNewUser({ ...newUser, country: e.target.value as 'MX' | 'GT' | 'HN' })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm"
                  >
                    <option value="GT">🇬🇹 Guatemala</option>
                    <option value="MX">🇲🇽 México</option>
                    <option value="HN">🇭🇳 Honduras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={e => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="50212345678"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  PIN inicial (mín. 6 caracteres)
                </label>
                <input
                  type="text"
                  value={newUser.pin}
                  onChange={e => setNewUser({ ...newUser, pin: e.target.value })}
                  placeholder="123456"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  El usuario lo cambia desde la app después del primer login
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  Wallet Celo (opcional)
                </label>
                <input
                  type="text"
                  value={newUser.celo_address}
                  onChange={e => setNewUser({ ...newUser, celo_address: e.target.value })}
                  placeholder="0x..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono"
                />
              </div>
            </div>
            <div className="border-t border-gray-800 px-5 py-4 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-2xl border-2 border-gray-700 text-gray-300 font-bold text-sm">Cancelar</button>
              <button onClick={createUser} className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm">Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN reset modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-md w-full">
            <div className="bg-gray-950 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">Resetear PIN</p>
                <p className="text-[10px] text-gray-500">{resetUser.display_name}</p>
              </div>
              <button onClick={() => { setResetUser(null); setNewPin(''); }} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  Nuevo PIN (mín. 6 caracteres)
                </label>
                <input
                  type="text"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="Nuevo PIN"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Comparte este PIN al usuario por canal seguro. Sugerencia: que lo cambie al primer login.
              </p>
            </div>
            <div className="border-t border-gray-800 px-5 py-4 flex gap-3">
              <button onClick={() => { setResetUser(null); setNewPin(''); }} className="flex-1 py-2.5 rounded-2xl border-2 border-gray-700 text-gray-300 font-bold text-sm">Cancelar</button>
              <button onClick={doResetPin} className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm">Resetear PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
