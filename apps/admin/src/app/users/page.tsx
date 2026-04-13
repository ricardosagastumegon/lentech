'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/admin-api';

interface AdminUser {
  id: string;
  phoneNumber: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  country: string;
  kycLevel: number;
  kycStatus: string;
  status: string;
  amlRisk: string;
  createdAt: string;
  lastLoginAt?: string;
}

const kycLevelNames = ['Anónimo', 'Básico', 'Verificado', 'Empresarial'];
const riskColors: Record<string, string> = {
  low:      'bg-green-100 text-green-800',
  medium:   'bg-yellow-100 text-yellow-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
const statusColors: Record<string, string> = {
  active:       'bg-green-100 text-green-800',
  pending_kyc:  'bg-yellow-100 text-yellow-800',
  suspended:    'bg-orange-100 text-orange-800',
  blocked:      'bg-red-100 text-red-800',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users', {
        params: { search, kycLevel: kycFilter, status: statusFilter, page, limit: 25 },
      });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, kycFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function suspendUser(userId: string) {
    if (!confirm('¿Suspender este usuario?')) return;
    await apiClient.post(`/admin/users/${userId}/suspend`);
    fetchUsers();
  }

  async function blockUser(userId: string) {
    if (!confirm('¿BLOQUEAR permanentemente este usuario? Esta acción requiere justificación.')) return;
    const reason = prompt('Razón del bloqueo (AML/Fraud):');
    if (!reason) return;
    await apiClient.post(`/admin/users/${userId}/block`, { reason });
    fetchUsers();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} usuarios registrados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Buscar por teléfono, email, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={kycFilter}
          onChange={e => setKycFilter(e.target.value)}
        >
          <option value="">Todos los KYC</option>
          <option value="0">Anónimo</option>
          <option value="1">Básico</option>
          <option value="2">Verificado</option>
          <option value="3">Empresarial</option>
        </select>
        <select
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="pending_kyc">Pendiente KYC</option>
          <option value="suspended">Suspendido</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Teléfono', 'País', 'KYC', 'Estado', 'Riesgo AML', 'Registro', 'Último acceso', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No hay usuarios</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{user.phoneNumber}</div>
                  {user.email && <div className="text-gray-400 text-xs">{user.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{user.country}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${user.kycLevel >= 2 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {kycLevelNames[user.kycLevel]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[user.status] ?? ''}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[user.amlRisk] ?? ''}`}>
                    {user.amlRisk}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(user.createdAt).toLocaleDateString('es-GT')}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('es-GT') : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <a href={`/users/${user.id}`} className="text-blue-600 hover:underline text-xs font-medium">Ver</a>
                    {user.status === 'active' && (
                      <button onClick={() => suspendUser(user.id)} className="text-orange-600 hover:underline text-xs font-medium">Suspender</button>
                    )}
                    {user.status !== 'blocked' && (
                      <button onClick={() => blockUser(user.id)} className="text-red-600 hover:underline text-xs font-medium">Bloquear</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Mostrando {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} de {total}</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >← Anterior</button>
          <button
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            onClick={() => setPage(p => p + 1)}
            disabled={page * 25 >= total}
          >Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
