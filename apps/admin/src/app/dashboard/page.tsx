'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/admin-api';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingKYC: number;
  openAlerts: number;
  criticalAlerts: number;
  dailyVolumeMondg: string;
  dailyVolumeUSD: number;
  totalTransactions: number;
  failedTransactions: number;
  generatedAt: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/metrics')
      .then(res => setMetrics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Cargando métricas...</div>;

  const cards = [
    { label: 'Usuarios totales',       value: metrics?.totalUsers.toLocaleString() ?? '-',      color: 'bg-blue-50 text-blue-800',   icon: '👥' },
    { label: 'Usuarios activos (30d)',  value: metrics?.activeUsers.toLocaleString() ?? '-',     color: 'bg-green-50 text-green-800', icon: '✅' },
    { label: 'KYC pendiente',          value: metrics?.pendingKYC.toLocaleString() ?? '-',       color: 'bg-yellow-50 text-yellow-800', icon: '🔐' },
    { label: 'Alertas abiertas',       value: metrics?.openAlerts.toLocaleString() ?? '-',       color: 'bg-orange-50 text-orange-800', icon: '⚠️' },
    { label: 'Alertas críticas',       value: metrics?.criticalAlerts.toLocaleString() ?? '-',   color: 'bg-red-50 text-red-800',     icon: '🚨' },
    { label: 'Volumen 24h (USD)',       value: `$${metrics?.dailyVolumeUSD.toLocaleString() ?? '0'}`, color: 'bg-purple-50 text-purple-800', icon: '💰' },
    { label: 'Transacciones 24h',      value: metrics?.totalTransactions.toLocaleString() ?? '-', color: 'bg-indigo-50 text-indigo-800', icon: '💸' },
    { label: 'Transacciones fallidas', value: metrics?.failedTransactions.toLocaleString() ?? '-', color: 'bg-red-50 text-red-800',   icon: '❌' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Última actualización: {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleString('es-GT') : '-'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl p-5 ${card.color}`}>
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className="text-sm font-medium opacity-75">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Alertas AML',   href: '/alerts',       desc: 'Revisar alertas pendientes', urgent: (metrics?.criticalAlerts ?? 0) > 0 },
          { title: 'Cola KYC',      href: '/kyc-review',   desc: 'Aprobar/rechazar documentos', urgent: (metrics?.pendingKYC ?? 0) > 0 },
          { title: 'Transacciones', href: '/transactions', desc: 'Ver todas las transacciones', urgent: false },
        ].map(link => (
          <a
            key={link.href}
            href={link.href}
            className={`block rounded-2xl p-6 border-2 transition-all hover:shadow-md
              ${link.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">{link.title}</h3>
              {link.urgent && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
            </div>
            <p className="text-gray-500 text-sm">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
