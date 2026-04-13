import Link from 'next/link';

interface Tx {
  id: string;
  type: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  description?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  completed:   'text-green-600',
  pending:     'text-yellow-600',
  processing:  'text-blue-600',
  confirming:  'text-blue-600',
  failed:      'text-red-600',
  reversed:    'text-gray-500',
};

const typeIcons: Record<string, string> = {
  transfer:     '→',
  purchase:     '⬇',
  sale:         '⬆',
  fiat_load:    '＋',
  fiat_withdraw:'－',
  fx_swap:      '⇄',
  fee:          '$',
  refund:       '↩',
};

export function RecentTransactions({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay transacciones recientes
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map(tx => (
        <Link
          key={tx.id}
          href={`/transactions/${tx.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0">
            {typeIcons[tx.type] ?? '→'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {tx.description ?? tx.type.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                {Number(tx.toAmount).toLocaleString()} {tx.toCoin}
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
      ))}
      <div className="pt-2 text-center">
        <Link href="/transactions" className="text-sm text-mondega-green font-medium hover:underline">
          Ver todas →
        </Link>
      </div>
    </div>
  );
}
