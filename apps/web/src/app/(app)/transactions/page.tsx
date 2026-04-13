'use client';

import { useEffect, useState, useCallback } from 'react';
import { TransactionItem } from '@/components/transactions/transaction-item';
import { TransactionFilter } from '@/components/transactions/transaction-filter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [total, setTotal] = useState(0);

  const fetchTransactions = useCallback(async (pg = 1, reset = false) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/wallet/transactions`, {
        params: { page: pg, limit: 20, filter },
      });
      const newItems: Transaction[] = res.data.items;
      setTransactions(prev => reset ? newItems : [...prev, ...newItems]);
      setHasMore(res.data.hasMore);
      setTotal(res.data.total);
      setPage(pg);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      <div className="pt-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <p className="text-gray-500 text-sm">{total} movimientos en total</p>
      </div>

      {/* Filter */}
      <TransactionFilter
        value={filter}
        onChange={(f) => setFilter(f as 'all' | 'sent' | 'received')}
        className="mb-4"
      />

      {/* List */}
      <div className="space-y-2">
        {transactions.map(tx => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <button
          className="btn-secondary w-full mt-4"
          onClick={() => fetchTransactions(page + 1)}
        >
          Cargar más
        </button>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">💸</div>
          <p className="text-gray-500">Aún no tienes movimientos</p>
          <a href="/send" className="text-mondega-green font-medium text-sm mt-2 block">
            Enviar mi primer pago →
          </a>
        </div>
      )}
    </div>
  );
}
