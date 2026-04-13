import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';

interface Tx {
  id: string;
  type: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  description?: string;
  fxUsdEquivalent?: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#16a34a', pending: '#d97706', processing: '#2563eb',
  confirming: '#2563eb', failed: '#dc2626', reversed: '#6b7280',
};

const TYPE_ICONS: Record<string, string> = {
  transfer: '→', purchase: '↓', sale: '↑',
  fiat_load: '+', fiat_withdraw: '−', fx_swap: '⇄',
  fee: '$', refund: '↩',
};

export function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', page, filter],
    queryFn: async () => {
      const res = await apiClient.get('/wallets/transactions', {
        params: { page, limit: 20, status: filter || undefined },
      });
      return res.data as { items: Tx[]; total: number };
    },
  });

  const txs = data?.items ?? [];

  const renderItem = useCallback(({ item }: { item: Tx }) => (
    <TouchableOpacity
      style={styles.txItem}
      onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
    >
      <View style={styles.txIcon}>
        <Text style={styles.txIconText}>{TYPE_ICONS[item.type] ?? '→'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.description ?? item.type.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.txDate}>
          {new Date(item.createdAt).toLocaleDateString('es-GT')}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>
          {Number(item.toAmount).toLocaleString()} {item.toCoin}
        </Text>
        <Text style={[styles.txStatus, { color: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  const FILTERS = ['', 'completed', 'pending', 'failed'];

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); setPage(1); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f || 'Todas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0D6E3E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={txs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0D6E3E" />}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay transacciones</Text>
          }
          contentContainerStyle={txs.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#0D6E3E' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#fff', marginBottom: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 18, color: '#475569' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' },
  txDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  txStatus: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
});
