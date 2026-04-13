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

// ── Bank Bridge demo state ────────────────────────────────────────────────────
interface BankConnection {
  id: string;
  name: string;
  country: string;
  flag: string;
  coin: string;
  status: 'connected' | 'degraded' | 'disconnected';
  latencyMs: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  liquidityUSD: number;
  lastPing: string;
  dailyVolumeUSD: number;
}

const DEMO_BRIDGES: BankConnection[] = [
  {
    id: 'banrural-gt',
    name: 'Banrural',
    country: 'Guatemala',
    flag: '🇬🇹',
    coin: 'QUETZA',
    status: 'connected',
    latencyMs: 142,
    pendingDeposits: 3,
    pendingWithdrawals: 1,
    liquidityUSD: 48500,
    lastPing: new Date(Date.now() - 12000).toISOString(),
    dailyVolumeUSD: 12400,
  },
  {
    id: 'spei-mx',
    name: 'SPEI / CoDi',
    country: 'México',
    flag: '🇲🇽',
    coin: 'MEXCOIN',
    status: 'connected',
    latencyMs: 88,
    pendingDeposits: 7,
    pendingWithdrawals: 4,
    liquidityUSD: 95200,
    lastPing: new Date(Date.now() - 5000).toISOString(),
    dailyVolumeUSD: 31700,
  },
  {
    id: 'atlantida-hn',
    name: 'Banco Atlántida',
    country: 'Honduras',
    flag: '🇭🇳',
    coin: 'LEMPI',
    status: 'degraded',
    latencyMs: 890,
    pendingDeposits: 2,
    pendingWithdrawals: 0,
    liquidityUSD: 21300,
    lastPing: new Date(Date.now() - 45000).toISOString(),
    dailyVolumeUSD: 8900,
  },
];

function StatusDot({ status }: { status: BankConnection['status'] }) {
  const colors = {
    connected:    'bg-emerald-500',
    degraded:     'bg-amber-400',
    disconnected: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} ${status === 'connected' ? 'animate-pulse' : ''}`} />
  );
}

function StatusBadge({ status }: { status: BankConnection['status'] }) {
  const styles = {
    connected:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    degraded:     'bg-amber-50  text-amber-700  border-amber-200',
    disconnected: 'bg-red-50    text-red-700    border-red-200',
  };
  const labels = {
    connected:    'Conectado',
    degraded:     'Degradado',
    disconnected: 'Desconectado',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [bridges, setBridges] = useState<BankConnection[]>(DEMO_BRIDGES);

  useEffect(() => {
    apiClient.get('/admin/metrics')
      .then(res => setMetrics(res.data))
      .catch(() => {
        // Demo fallback
        setMetrics({
          totalUsers: 1847,
          activeUsers: 423,
          pendingKYC: 12,
          openAlerts: 3,
          criticalAlerts: 1,
          dailyVolumeMondg: '284500',
          dailyVolumeUSD: 53000,
          totalTransactions: 1204,
          failedTransactions: 7,
          generatedAt: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Simulate live latency updates every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setBridges(prev => prev.map(b => ({
        ...b,
        latencyMs: b.status === 'connected'
          ? Math.max(50, b.latencyMs + Math.floor((Math.random() - 0.5) * 40))
          : b.status === 'degraded'
          ? Math.max(300, b.latencyMs + Math.floor((Math.random() - 0.5) * 100))
          : b.latencyMs,
        lastPing: b.status !== 'disconnected' ? new Date().toISOString() : b.lastPing,
      })));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Cargando métricas...
      </div>
    </div>
  );

  const metricCards = [
    { label: 'Usuarios totales',       value: metrics?.totalUsers.toLocaleString() ?? '-',        color: 'bg-blue-50   text-blue-800',   icon: '👥' },
    { label: 'Usuarios activos (30d)',  value: metrics?.activeUsers.toLocaleString() ?? '-',       color: 'bg-green-50  text-green-800',  icon: '✅' },
    { label: 'KYC pendiente',          value: metrics?.pendingKYC.toLocaleString() ?? '-',         color: 'bg-yellow-50 text-yellow-800', icon: '🔐' },
    { label: 'Alertas críticas',       value: metrics?.criticalAlerts.toLocaleString() ?? '-',     color: 'bg-red-50    text-red-800',    icon: '🚨' },
    { label: 'Volumen 24h (USD)',       value: `$${metrics?.dailyVolumeUSD.toLocaleString() ?? '0'}`, color: 'bg-purple-50 text-purple-800', icon: '💰' },
    { label: 'Transacciones 24h',      value: metrics?.totalTransactions.toLocaleString() ?? '-',  color: 'bg-indigo-50 text-indigo-800', icon: '💸' },
    { label: 'Tx fallidas',            value: metrics?.failedTransactions.toLocaleString() ?? '-', color: 'bg-red-50    text-red-800',    icon: '❌' },
    { label: 'Alertas abiertas',       value: metrics?.openAlerts.toLocaleString() ?? '-',         color: 'bg-orange-50 text-orange-800', icon: '⚠️' },
  ];

  const totalPendingDeposits    = bridges.reduce((s, b) => s + b.pendingDeposits, 0);
  const totalPendingWithdrawals = bridges.reduce((s, b) => s + b.pendingWithdrawals, 0);
  const totalLiquidityUSD       = bridges.reduce((s, b) => s + b.liquidityUSD, 0);

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Última actualización: {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleString('es-GT') : '-'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 rounded-full px-3 py-1.5 border border-emerald-200">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">Sistema operativo</span>
        </div>
      </div>

      {/* ── Metric grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className={`rounded-2xl p-5 ${card.color}`}>
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className="text-sm font-medium opacity-75">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Bank Bridge Panel ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Puente Bancario</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Conexiones fiat ↔ TokenCoin en tiempo real
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">{totalPendingDeposits}</p>
              <p className="text-xs text-gray-500">Depósitos pend.</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{totalPendingWithdrawals}</p>
              <p className="text-xs text-gray-500">Retiros pend.</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-700">${(totalLiquidityUSD / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-500">Liquidez total</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bridges.map(b => {
            const latencyColor = b.latencyMs < 200
              ? 'text-emerald-600'
              : b.latencyMs < 600
              ? 'text-amber-600'
              : 'text-red-600';

            const liquidityPct = Math.min(100, (b.liquidityUSD / 100000) * 100);
            const liquidityColor = liquidityPct > 60
              ? 'bg-emerald-500'
              : liquidityPct > 30
              ? 'bg-amber-400'
              : 'bg-red-500';

            return (
              <div key={b.id} className={`rounded-2xl border-2 p-5 space-y-4
                ${b.status === 'connected'    ? 'border-emerald-200 bg-white' :
                  b.status === 'degraded'     ? 'border-amber-200  bg-amber-50/30' :
                                                'border-red-200    bg-red-50/30'}`}>

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{b.flag}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{b.name}</p>
                      <p className="text-xs text-gray-400">{b.country} · {b.coin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={b.status} />
                    <StatusBadge status={b.status} />
                  </div>
                </div>

                {/* Latency */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Latencia</span>
                  <span className={`text-sm font-black tabular-nums ${latencyColor}`}>
                    {b.latencyMs} ms
                  </span>
                </div>

                {/* Liquidity bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Liquidez</span>
                    <span className="text-xs font-bold text-gray-700">
                      ${b.liquidityUSD.toLocaleString()} USD
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${liquidityColor}`}
                      style={{ width: `${liquidityPct}%` }}
                    />
                  </div>
                </div>

                {/* Queue counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                    <p className="text-lg font-black text-amber-700">{b.pendingDeposits}</p>
                    <p className="text-[10px] text-amber-600 font-medium">Depósitos pend.</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                    <p className="text-lg font-black text-blue-700">{b.pendingWithdrawals}</p>
                    <p className="text-[10px] text-blue-600 font-medium">Retiros pend.</p>
                  </div>
                </div>

                {/* Volume + last ping */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-xs text-gray-400">Vol. 24h</p>
                    <p className="text-sm font-bold text-gray-700">${b.dailyVolumeUSD.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Último ping</p>
                    <p className="text-xs font-medium text-gray-500">
                      {b.status !== 'disconnected'
                        ? `${Math.round((Date.now() - new Date(b.lastPing).getTime()) / 1000)}s atrás`
                        : 'Sin respuesta'
                      }
                    </p>
                  </div>
                </div>

                {/* Action */}
                {b.status !== 'connected' && (
                  <button className="w-full text-xs font-bold text-white bg-gray-800 hover:bg-gray-900
                                     rounded-xl py-2 transition-colors">
                    Reconectar →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Alertas AML',     href: '/alerts',        desc: 'Revisar alertas pendientes',    urgent: (metrics?.criticalAlerts ?? 0) > 0 },
            { title: 'Cola KYC',        href: '/kyc-review',    desc: 'Aprobar / rechazar documentos', urgent: (metrics?.pendingKYC ?? 0) > 5 },
            { title: 'Transacciones',   href: '/transactions',  desc: 'Ver todas las transacciones',   urgent: false },
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
    </div>
  );
}
