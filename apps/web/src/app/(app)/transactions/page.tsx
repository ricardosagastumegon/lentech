'use client';

import { useState, useMemo } from 'react';
import { useWalletStore, Transaction, COINS, CoinCode, ACTIVE_COINS } from '@/store/wallet.store';
import { useAuthStore } from '@/store/auth.store';

// ─── Extended demo transactions ───────────────────────────────────────────────
const DEMO_TX_BASE: Transaction[] = [
  {
    id: 'tx-001', type: 'fiat_load', status: 'completed', direction: 'received',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '2450.00', toAmount: '2450.00',
    fee: '0', feeUSD: 0, description: 'Carga desde Banrural GT',
    recipientName: 'Carlos Mendoza', senderName: 'Banrural Guatemala',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 172700000).toISOString(),
  },
  {
    id: 'tx-002', type: 'transfer', status: 'completed', direction: 'received',
    fromCoin: 'MEXCOIN', toCoin: 'QUETZA', fromAmount: '500.00', toAmount: '64.74',
    fxRate: 0.1295, fee: '1.50', feeUSD: 0.08, description: 'Pago de Sofía',
    recipientName: 'Carlos Mendoza', senderName: 'Sofía Hernández',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86300000).toISOString(),
  },
  {
    id: 'tx-003', type: 'transfer', status: 'completed', direction: 'sent',
    fromCoin: 'QUETZA', toCoin: 'LEMPI', fromAmount: '200.00', toAmount: '625.30',
    fxRate: 3.1265, fee: '0.60', feeUSD: 0.08, description: 'Envío familiar',
    recipientName: 'José Reyes', senderName: 'Carlos Mendoza',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    completedAt: new Date(Date.now() - 43100000).toISOString(),
  },
  {
    id: 'tx-004', type: 'purchase', status: 'completed', direction: 'sent',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '350.00', toAmount: '350.00',
    fee: '1.05', feeUSD: 0.14, description: 'Tienda El Progreso',
    recipientName: 'Tienda El Progreso', senderName: 'Carlos Mendoza',
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    completedAt: new Date(Date.now() - 21500000).toISOString(),
  },
  {
    id: 'tx-005', type: 'fx_swap', status: 'completed', direction: 'internal',
    fromCoin: 'QUETZA', toCoin: 'MEXCOIN', fromAmount: '300.00', toAmount: '1162.30',
    fxRate: 3.874, fee: '0.90', feeUSD: 0.12, description: 'Swap QUETZA → MEXCOIN',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
  },
  {
    id: 'tx-006', type: 'transfer', status: 'pending', direction: 'sent',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '150.00', toAmount: '150.00',
    fee: '0', description: 'Pago pendiente',
    recipientName: 'Ana García', senderName: 'Carlos Mendoza',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'tx-007', type: 'token_buy', status: 'completed', direction: 'internal',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '1250.00', toAmount: '1250.00',
    fee: '0', feePercent: 0, description: 'Compra 1,250.00 QUETZA · 0%',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3590000).toISOString(),
  },
  {
    id: 'tx-008', type: 'fiat_withdraw', status: 'completed', direction: 'sent',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '500.00', toAmount: '497.50',
    fee: '2.50', feeUSD: 0.32, description: 'Retiro a cuenta Banrural',
    senderName: 'Carlos Mendoza',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    completedAt: new Date(Date.now() - 259100000).toISOString(),
  },
  {
    id: 'tx-009', type: 'fiat_load', status: 'completed', direction: 'received',
    fromCoin: 'QUETZA', toCoin: 'QUETZA', fromAmount: '1250.00', toAmount: '1250.00',
    fee: '0', description: 'Depósito GTQ · Banrural',
    senderName: 'Banrural Guatemala',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
  },
];

// ─── Types & helpers ──────────────────────────────────────────────────────────
type FilterType = 'all' | 'sent' | 'received' | 'load' | 'swap';

const TYPE_LABELS: Record<Transaction['type'], string> = {
  transfer:     'Transferencia',
  fiat_load:    'Depósito',
  fiat_withdraw:'Retiro bancario',
  fx_swap:      'Swap',
  fee:          'Comisión',
  refund:       'Reembolso',
  purchase:     'Compra',
  token_buy:    'Compra de tokens',
  token_sell:   'Venta de tokens',
};

const STATUS_COLORS: Record<Transaction['status'], string> = {
  completed:  'text-emerald-600 bg-emerald-50',
  pending:    'text-amber-600 bg-amber-50',
  processing: 'text-blue-600 bg-blue-50',
  failed:     'text-red-600 bg-red-50',
  reversed:   'text-gray-500 bg-gray-100',
};

const STATUS_LABELS: Record<Transaction['status'], string> = {
  completed:  'Completada',
  pending:    'Pendiente',
  processing: 'Procesando',
  failed:     'Fallida',
  reversed:   'Revertida',
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'Ahora mismo';
  if (mins < 60)   return `Hace ${mins} min`;
  if (hours < 24)  return `Hace ${hours}h`;
  if (days < 7)    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' });
}

function TxIcon({ tx }: { tx: Transaction }) {
  const fromMeta = COINS[tx.fromCoin];
  const toMeta   = COINS[tx.toCoin];
  const isCross  = tx.fromCoin !== tx.toCoin;

  if (tx.type === 'fiat_load') {
    return (
      <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
        <span className="text-xl">{fromMeta.flag}</span>
      </div>
    );
  }
  if (tx.type === 'fiat_withdraw') {
    return (
      <div className="w-11 h-11 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
        <span className="text-xl">{fromMeta.flag}</span>
      </div>
    );
  }
  if (tx.type === 'fx_swap' || isCross) {
    return (
      <div className="relative w-11 h-11 flex-shrink-0">
        <div className="absolute top-0 left-0 w-8 h-8 bg-len-light rounded-xl flex items-center justify-center border border-len-border">
          <span className="text-base">{fromMeta.flag}</span>
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-len-border shadow-sm">
          <span className="text-base">{toMeta.flag}</span>
        </div>
      </div>
    );
  }
  if (tx.type === 'token_buy') {
    return (
      <div className="w-11 h-11 bg-len-light rounded-2xl flex items-center justify-center flex-shrink-0 border border-len-border">
        <svg className="w-5 h-5 text-len-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  if (tx.type === 'token_sell') {
    return (
      <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-200">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  if (tx.type === 'purchase') {
    return (
      <div className="w-11 h-11 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-len-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    );
  }
  // transfer
  const isReceived = tx.direction === 'received';
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
      ${isReceived ? 'bg-emerald-100' : 'bg-len-light'}`}>
      <span className="text-xl">{isReceived ? fromMeta.flag : toMeta.flag}</span>
    </div>
  );
}

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const storeTxs = useWalletStore(s => s.transactions);

  // Merge store txs + demo fallback
  const allTxs: Transaction[] = storeTxs.length > 0 ? storeTxs : DEMO_TX_BASE;

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [coinFilter, setCoinFilter] = useState<CoinCode | 'all'>('all');
  const [dateRange,  setDateRange]  = useState<'all' | '7d' | '30d' | '90d'>('all');

  const filtered = useMemo(() => {
    let txs = [...allTxs].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Date range
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 86400000;
      txs = txs.filter(tx => new Date(tx.createdAt).getTime() > cutoff);
    }

    // Type filter
    if (typeFilter === 'sent')     txs = txs.filter(tx => tx.direction === 'sent');
    if (typeFilter === 'received') txs = txs.filter(tx => tx.direction === 'received');
    if (typeFilter === 'load')     txs = txs.filter(tx => tx.type === 'fiat_load' || tx.type === 'fiat_withdraw');
    if (typeFilter === 'swap')     txs = txs.filter(tx => tx.type === 'fx_swap');

    // Coin filter
    if (coinFilter !== 'all') {
      txs = txs.filter(tx => tx.fromCoin === coinFilter || tx.toCoin === coinFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(tx =>
        tx.description?.toLowerCase().includes(q) ||
        tx.recipientName?.toLowerCase().includes(q) ||
        tx.senderName?.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
      );
    }

    return txs;
  }, [allTxs, typeFilter, coinFilter, dateRange, search]);

  // Summary stats
  const totalSent     = allTxs.filter(t => t.direction === 'sent').length;
  const totalReceived = allTxs.filter(t => t.direction === 'received').length;
  const totalInternal = allTxs.filter(t => t.direction === 'internal').length;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">

      {/* ── Header ── */}
      <div className="pt-5 mb-5">
        <h1 className="text-2xl font-black text-len-dark">Actividad</h1>
        <p className="text-gray-400 text-sm">{allTxs.length} movimientos · {user?.displayName?.split(' ')[0] ?? 'Tu cuenta'}</p>
      </div>

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Enviados',  value: totalSent,     color: 'text-len-purple',   bg: 'bg-len-light border-len-border' },
          { label: 'Recibidos', value: totalReceived,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Internos',  value: totalInternal,  color: 'text-gray-600',    bg: 'bg-white border-len-border' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border px-3 py-2.5 text-center ${c.bg}`}>
            <p className={`text-lg font-black ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-gray-400 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border-2 border-len-border rounded-2xl pl-10 pr-4 py-3 text-sm
                     text-len-dark placeholder:text-gray-300 focus:outline-none focus:border-len-purple transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            ✕
          </button>
        )}
      </div>

      {/* ── Type filter chips ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {([
          { key: 'all',      label: 'Todos' },
          { key: 'sent',     label: 'Enviados' },
          { key: 'received', label: 'Recibidos' },
          { key: 'load',     label: 'Cargas' },
          { key: 'swap',     label: 'Swap FX' },
        ] as { key: FilterType; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all
              ${typeFilter === f.key
                ? 'bg-len-purple text-white shadow-len'
                : 'bg-white border-2 border-len-border text-gray-500 hover:border-len-violet'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Coin + date filters ── */}
      <div className="flex gap-2 mb-5">
        {/* Coin selector */}
        <div className="relative flex-1">
          <select
            value={coinFilter}
            onChange={e => setCoinFilter(e.target.value as CoinCode | 'all')}
            className="w-full appearance-none bg-white border-2 border-len-border rounded-2xl
                       pl-3 pr-8 py-2.5 text-xs font-bold text-len-dark focus:outline-none
                       focus:border-len-purple cursor-pointer transition-colors"
          >
            <option value="all">🌎 Todas las monedas</option>
            {ACTIVE_COINS.map(code => {
              const m = COINS[code as CoinCode];
              return <option key={code} value={code}>{m.flag} {code}</option>;
            })}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">▾</span>
        </div>

        {/* Date range */}
        <div className="relative flex-1">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="w-full appearance-none bg-white border-2 border-len-border rounded-2xl
                       pl-3 pr-8 py-2.5 text-xs font-bold text-len-dark focus:outline-none
                       focus:border-len-purple cursor-pointer transition-colors"
          >
            <option value="all">Siempre</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">▾</span>
        </div>
      </div>

      {/* ── Results count ── */}
      {(typeFilter !== 'all' || coinFilter !== 'all' || dateRange !== 'all' || search) && (
        <p className="text-xs text-gray-400 mb-3 font-medium">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          {' '}
          <button
            onClick={() => { setTypeFilter('all'); setCoinFilter('all'); setDateRange('all'); setSearch(''); }}
            className="text-len-purple hover:underline font-semibold ml-1"
          >
            Limpiar filtros
          </button>
        </p>
      )}

      {/* ── Transaction list ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-len-light rounded-3xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 font-semibold mb-1">Sin movimientos</p>
          <p className="text-gray-400 text-sm">Prueba cambiando los filtros</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const isReceived = tx.direction === 'received';
            const isInternal = tx.direction === 'internal';
            const isCross    = tx.fromCoin !== tx.toCoin;
            const fromMeta   = COINS[tx.fromCoin];
            const toMeta     = COINS[tx.toCoin];

            const counterpart = isReceived
              ? (tx.senderName ?? 'Desconocido')
              : (tx.recipientName ?? 'Desconocido');

            const amountDisplay = isCross
              ? `${parseFloat(tx.fromAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tx.fromCoin}`
              : `${parseFloat(isReceived ? tx.toAmount : tx.fromAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tx.fromCoin}`;

            const sign = isReceived ? '+' : isInternal ? '⇄' : '-';
            const amountColor = isReceived
              ? 'text-emerald-600'
              : isInternal ? 'text-len-purple'
              : 'text-len-dark';

            return (
              <div key={tx.id}
                className="bg-white rounded-3xl border border-len-border p-4 flex items-center gap-3
                           hover:border-len-violet hover:shadow-sm transition-all cursor-pointer">

                {/* Icon */}
                <TxIcon tx={tx} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-len-dark truncate leading-snug">
                    {tx.description ?? TYPE_LABELS[tx.type]}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[tx.status]}`}>
                      {STATUS_LABELS[tx.status]}
                    </span>
                    {!isInternal && counterpart !== 'Desconocido' && (
                      <span className="text-[10px] text-gray-400 truncate">{counterpart}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {formatRelativeDate(tx.createdAt)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0 max-w-[42%]">
                  <p className={`text-sm font-black tabular-nums leading-snug ${amountColor}`}>
                    {sign}{amountDisplay}
                  </p>
                  {isCross && (
                    <p className="text-[11px] text-emerald-600 font-semibold tabular-nums">
                      → {parseFloat(tx.toAmount).toLocaleString('en-US', { maximumFractionDigits: 0 })} {tx.toCoin}
                    </p>
                  )}
                  {parseFloat(tx.fee ?? '0') > 0 && (
                    <p className="text-[10px] text-gray-300 tabular-nums">
                      fee {tx.fee}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Export hint ── */}
      {filtered.length > 0 && (
        <div className="mt-6 text-center">
          <button className="text-xs text-gray-400 hover:text-len-purple transition-colors font-medium">
            ↓ Exportar CSV · PDF
          </button>
        </div>
      )}
    </div>
  );
}
