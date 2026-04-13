import Link from 'next/link';
import { useWalletStore, COINS } from '@/store/wallet.store';

const statusColors: Record<string, string> = {
  completed:  'text-green-600',
  pending:    'text-yellow-600',
  processing: 'text-blue-600',
  confirming: 'text-blue-600',
  failed:     'text-red-600',
  reversed:   'text-gray-500',
};

const typeIcons: Record<string, string> = {
  transfer:      '→',
  purchase:      '⬇',
  sale:          '⬆',
  fiat_load:     '＋',
  fiat_withdraw: '－',
  fx_swap:       '⇄',
  fee:           '$',
  refund:        '↩',
};

export function RecentTransactions({ loading }: { loading: boolean }) {
  const transactions = useWalletStore((s) => s.transactions);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay transacciones recientes
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => {
        const isReceived = tx.direction === 'received';
        const isFX = tx.fromCoin !== tx.toCoin;
        const coinMeta = COINS[tx.toCoin];

        return (
          <Link
            key={tx.id}
            href={`/transactions/${tx.id}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0">
              {isFX ? '⇄' : (typeIcons[tx.type] ?? (isReceived ? '⬇' : '→'))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {tx.description ?? tx.type.replace(/_/g, ' ')}
                  {isFX && (
                    <span className="ml-1 text-xs text-blue-500 font-normal">
                      {tx.fromCoin}→{tx.toCoin}
                    </span>
                  )}
                </span>
                <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${isReceived ? 'text-green-600' : 'text-gray-900'}`}>
                  {isReceived ? '+' : '-'}{Number(tx.toAmount).toLocaleString()} {tx.toCoin}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className={`text-xs ${statusColors[tx.status] ?? 'text-gray-400'}`}>
                  {tx.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(tx.createdAt).toLocaleDateString('es-GT')}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
