import Link from 'next/link';

interface Transaction {
  id: string;
  type: string;
  status: string;
  direction: 'sent' | 'received';
  amountMondg: string;
  feeMondg: string;
  description?: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
}

const statusBadge: Record<string, string> = {
  completed:  'bg-green-100 text-green-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  confirming: 'bg-blue-100 text-blue-700',
  failed:     'bg-red-100 text-red-700',
  reversed:   'bg-gray-100 text-gray-600',
};

const typeIcons: Record<string, string> = {
  transfer: '→', purchase: '⬇', sale: '⬆',
  fiat_load: '＋', fiat_withdraw: '－', fx_swap: '⇄',
  fee: '$', refund: '↩',
};

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isReceived = transaction.direction === 'received';

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors rounded-xl border border-gray-100"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg flex-shrink-0">
        {typeIcons[transaction.type] ?? (isReceived ? '⬇' : '→')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {transaction.description ?? transaction.type.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(transaction.createdAt).toLocaleString('es-GT')}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-semibold ${isReceived ? 'text-green-600' : 'text-gray-900'}`}>
              {isReceived ? '+' : '-'}{Number(transaction.amountMondg).toLocaleString()} MONDG
            </p>
          </div>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge[transaction.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {transaction.status}
      </span>
    </Link>
  );
}
