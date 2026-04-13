'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/admin-api';

interface AMLAlert {
  id: string;
  userId: string;
  transactionId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  ruleTriggered: string;
  description: string;
  status: 'open' | 'investigating' | 'cleared' | 'reported';
  createdAt: string;
}

const riskColors = {
  low:      'bg-green-100 text-green-800',
  medium:   'bg-yellow-100 text-yellow-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800 font-bold',
};

const statusColors = {
  open:          'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  cleared:       'bg-green-100 text-green-800',
  reported:      'bg-blue-100 text-blue-800',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AMLAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [riskFilter, setRiskFilter] = useState('');

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await apiClient.get('/compliance/alerts', {
        params: { status: statusFilter, riskLevel: riskFilter, limit: 50 },
      });
      setAlerts(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAlerts(); }, [statusFilter, riskFilter]);

  async function resolveAlert(alertId: string, status: 'cleared' | 'reported') {
    const notes = prompt(`Notas de resolución (${status === 'reported' ? 'se reportará a la autoridad' : 'se cerrará como limpio'}):`) ?? '';
    await apiClient.post(`/compliance/alerts/${alertId}/resolve`, {
      status,
      notes,
      assignedTo: 'admin',
    });
    fetchAlerts();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alertas AML</h1>
        <p className="text-gray-500 text-sm mt-1">Anti-lavado de dinero — GAFILAT / FATF</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['open', 'investigating', 'cleared', 'reported'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s === 'open' ? 'Abiertas' : s === 'investigating' ? 'En revisión' : s === 'cleared' ? 'Cerradas' : 'Reportadas'}
          </button>
        ))}
        <select
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm ml-auto"
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
        >
          <option value="">Todos los riesgos</option>
          <option value="critical">Crítico</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
          <option value="low">Bajo</option>
        </select>
      </div>

      {/* Alert cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando alertas...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No hay alertas con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl border-l-4 border border-gray-200 p-5
                ${alert.riskLevel === 'critical' ? 'border-l-red-500' :
                  alert.riskLevel === 'high' ? 'border-l-orange-500' :
                  alert.riskLevel === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${riskColors[alert.riskLevel]}`}>
                      {alert.riskLevel.toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${statusColors[alert.status]}`}>
                      {alert.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(alert.createdAt).toLocaleString('es-GT')}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-900 text-sm mb-1">Usuario: {alert.userId}</p>
                  {alert.transactionId && (
                    <p className="text-gray-500 text-xs mb-1">TX: {alert.transactionId}</p>
                  )}
                  <p className="text-gray-700 text-sm font-mono bg-gray-50 rounded-lg p-2 mb-2 break-all">
                    {alert.ruleTriggered}
                  </p>
                </div>

                {alert.status === 'open' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolveAlert(alert.id, 'cleared')}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                    >
                      ✓ Limpiar
                    </button>
                    <button
                      onClick={() => resolveAlert(alert.id, 'reported')}
                      className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      📋 Reportar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
