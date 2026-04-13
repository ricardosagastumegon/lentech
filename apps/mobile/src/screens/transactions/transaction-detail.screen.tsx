import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';

interface TxDetail {
  id: string;
  type: string;
  status: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  feeAmount: string;
  feeCoin?: string;
  fxRate?: number;
  fxUsdEquivalent?: number;
  blockchainTxHash?: string;
  blockNumber?: number;
  confirmations?: number;
  description?: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#16a34a', pending: '#d97706',
  processing: '#2563eb', confirming: '#2563eb',
  failed: '#dc2626', reversed: '#6b7280',
};

export function TransactionDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params as { id: string };

  const { data: tx, isLoading } = useQuery({
    queryKey: ['tx', id],
    queryFn: async () => {
      const res = await apiClient.get(`/wallets/transactions/${id}`);
      return res.data as TxDetail;
    },
  });

  if (isLoading) return <ActivityIndicator size="large" color="#0D6E3E" style={{ marginTop: 60 }} />;
  if (!tx) return <Text style={styles.empty}>Transacción no encontrada</Text>;

  function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, mono && styles.mono]} selectable>{value}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statusCard}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[tx.status] ?? '#6b7280' }]}>
          {tx.status.toUpperCase()}
        </Text>
        <Text style={styles.amountText}>
          {Number(tx.toAmount).toLocaleString()} {tx.toCoin}
        </Text>
        {tx.fxUsdEquivalent && (
          <Text style={styles.usdText}>
            ≈ ${tx.fxUsdEquivalent.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Row label="ID" value={tx.id} mono />
        <Row label="Tipo" value={tx.type.replace(/_/g, ' ')} />
        <Row label="Enviado" value={`${Number(tx.fromAmount).toLocaleString()} ${tx.fromCoin}`} />
        <Row label="Recibido" value={`${Number(tx.toAmount).toLocaleString()} ${tx.toCoin}`} />
        {Number(tx.feeAmount) > 0 && (
          <Row label="Fee" value={`${Number(tx.feeAmount).toLocaleString()} ${tx.feeCoin ?? tx.fromCoin}`} />
        )}
        {tx.fxRate && <Row label="Tasa FX" value={tx.fxRate.toFixed(6)} mono />}
        <Row label="Fecha" value={new Date(tx.createdAt).toLocaleString('es-GT')} />
        {tx.completedAt && <Row label="Completado" value={new Date(tx.completedAt).toLocaleString('es-GT')} />}
        {tx.description && <Row label="Descripción" value={tx.description} />}
        {tx.failureReason && <Row label="Error" value={tx.failureReason} />}
      </View>

      {tx.blockchainTxHash && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Blockchain</Text>
          <Row label="Confirmaciones" value={String(tx.confirmations ?? 0)} />
          {tx.blockNumber && <Row label="Bloque" value={String(tx.blockNumber)} mono />}
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://polygonscan.com/tx/${tx.blockchainTxHash}`)}
          >
            <Text style={styles.link}>Ver en Polygonscan →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  amountText: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  usdText: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 13, color: '#64748b', flex: 1 },
  value: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  link: { color: '#0D6E3E', fontWeight: '600', fontSize: 14, marginTop: 8 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60 },
});
