import Link from 'next/link';
import { useWalletStore, COINS, Transaction } from '@/store/wallet.store';

const STATUS_LABELS: Record<Transaction['status'], string> = {
  completed:  'Completada',
  pending:    'Pendiente',
  processing: 'Procesando',
  failed:     'Fallida',
  reversed:   'Revertida',
};

const STATUS_COLORS: Record<Transaction['status'], string> = {
  completed:  'text-emerald-600',
  pending:    'text-amber-500',
  processing: 'text-blue-500',
  failed:     'text-red-500',
  reversed:   'text-gray-400',
};

function formatRelative(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Ahora';
  if (mins < 60)  return `Hace ${mins}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7)   return `Hace ${days}d`;
  return new Date(iso).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' });
}

function TxIcon({ tx }: { tx: Transaction }) {
  const isCross = tx.fromCoin !== tx.toCoin;
  const meta    = COINS[tx.toCoin] ?? COINS[tx.fromCoin];
  const fmeta   = COINS[tx.fromCoin];

  // Token buy
  if (tx.type === 'token_buy') return (
    <div className="w-10 h-10 bg-len-light rounded-xl flex items-center justify-center flex-shrink-0 border border-len-border">
      <svg className="w-5 h-5 text-len-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  // Token sell
  if (tx.type === 'token_sell') return (
    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-200">
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  // Fiat deposit
  if (tx.type === 'fiat_load') return (
    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
      <span className="text-lg">{fmeta.flag}</span>
    </div>
  );

  // Fiat withdrawal
  if (tx.type === 'fiat_withdraw') return (
    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-200">
      <span className="text-lg">{fmeta.flag}</span>
    </div>
  );

  // FX / cross-coin
  if (isCross) return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <div className="absolute top-0 left-0 w-7 h-7 bg-len-light rounded-lg flex items-center justify-center border border-len-border">
        <span className="text-sm">{fmeta.flag}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-len-border shadow-sm">
        <span className="text-sm">{COINS[tx.toCoin].flag}</span>
      </div>
    </div>
  );

  // Transfer sent/received
  const isReceived = tx.direction === 'received';
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border
      ${isReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-len-light border-len-border'}`}>
      <span className="text-lg">{meta.flag}</span>
    </div>
  );
}

export function RecentTransactions({ loading }: { loading: boolean }) {
  const transactions = useWalletStore(s => s.transactions);
  const recent = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse bg-white border border-len-border">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-20" />
            </div>
            <div className="w-16 h-3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Sin movimientos aún
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {recent.map(tx => {
        const isReceived = tx.direction === 'received';
        const isInternal = tx.direction === 'internal';
        const isCross    = tx.fromCoin !== tx.toCoin;

        const amtNum = parseFloat(isReceived ? tx.toAmount : tx.fromAmount);
        const amtStr = amtNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const coin   = isReceived ? tx.toCoin : tx.fromCoin;

        const sign  = isReceived ? '+' : isInternal ? '' : '-';
        const color = isReceived ? 'text-emerald-600' : isInternal ? 'text-len-purple' : 'text-len-dark';

        return (
          <Link
            key={tx.id}
            href="/transactions"
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-len-light active:bg-len-light transition-colors"
          >
            <TxIcon tx={tx} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-len-dark truncate leading-snug">
                {tx.description ?? tx.type.replace(/_/g, ' ')}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold ${STATUS_COLORS[tx.status]}`}>
                  {STATUS_LABELS[tx.status]}
                </span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-gray-400">{formatRelative(tx.createdAt)}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0 max-w-[38%]">
              <p className={`text-sm font-black tabular-nums leading-snug ${color}`}>
                {sign}{amtStr}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{coin}</p>
              {isCross && (
                <p className="text-[10px] text-emerald-600 font-semibold tabular-nums">
                  → {parseFloat(tx.toAmount).toLocaleString('en-US', { maximumFractionDigits: 0 })} {tx.toCoin}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
