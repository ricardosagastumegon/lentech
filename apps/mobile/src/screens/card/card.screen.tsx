import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';

interface Card {
  id: string;
  cardType: 'virtual' | 'physical';
  status: 'pending' | 'active' | 'frozen' | 'terminated';
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  spendingLimitDailyUsd: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a', pending: '#d97706', frozen: '#2563eb', terminated: '#dc2626',
};

export function CardScreen() {
  const qc = useQueryClient();
  const [revealedPan, setRevealedPan] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await apiClient.get('/cards');
      return res.data.cards as Card[];
    },
  });

  const issueCard = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/cards/issue', { cardType: 'virtual' });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });

  const toggleFreeze = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'frozen' ? 'active' : 'frozen';
      await apiClient.patch(`/cards/${id}/status`, { status: newStatus });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });

  const revealCard = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.get(`/cards/${id}/reveal`);
      return res.data as { pan: string; cvv: string; expiryMonth: number; expiryYear: number };
    },
    onSuccess: (data) => {
      setRevealedPan(data.pan);
      Alert.alert(
        'Datos de tarjeta',
        `PAN: ${data.pan}\nCVV: ${data.cvv}\nExp: ${String(data.expiryMonth).padStart(2, '0')}/${data.expiryYear}`,
        [{ text: 'Ocultar', onPress: () => setRevealedPan(null) }]
      );
    },
  });

  if (isLoading) return <ActivityIndicator size="large" color="#0D6E3E" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tarjeta Mondega</Text>

      {cards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>▣</Text>
          <Text style={styles.emptyTitle}>Sin tarjeta aún</Text>
          <Text style={styles.emptyDesc}>Obtén tu tarjeta virtual gratuita para pagar en línea</Text>
          <TouchableOpacity
            style={styles.issueBtn}
            onPress={() => issueCard.mutate()}
            disabled={issueCard.isPending}
          >
            {issueCard.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.issueBtnText}>Solicitar tarjeta virtual</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        cards.map(card => (
          <View key={card.id} style={styles.cardContainer}>
            {/* Card visual */}
            <View style={[styles.cardVisual, card.status === 'frozen' && styles.cardFrozen]}>
              <Text style={styles.cardBrand}>MONDEGA</Text>
              <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardLabel}>TITULAR</Text>
                  <Text style={styles.cardValue}>{card.cardholderName}</Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>EXP</Text>
                  <Text style={styles.cardValue}>
                    {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                  </Text>
                </View>
              </View>
              {card.status === 'frozen' && (
                <View style={styles.frozenOverlay}>
                  <Text style={styles.frozenText}>CONGELADA</Text>
                </View>
              )}
            </View>

            {/* Card info */}
            <View style={styles.infoRow}>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[card.status]}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[card.status] }]}>
                  {card.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.limitText}>Límite diario: ${card.spendingLimitDailyUsd.toLocaleString()} USD</Text>
            </View>

            {/* Actions */}
            {card.status !== 'terminated' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => revealCard.mutate(card.id)}
                  disabled={revealCard.isPending}
                >
                  <Text style={styles.actionText}>Ver datos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, card.status === 'frozen' && styles.actionBtnActive]}
                  onPress={() => toggleFreeze.mutate({ id: card.id, status: card.status })}
                  disabled={toggleFreeze.isPending}
                >
                  <Text style={[styles.actionText, card.status === 'frozen' && styles.actionTextActive]}>
                    {card.status === 'frozen' ? 'Descongelar' : 'Congelar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48, color: '#94a3b8' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  issueBtn: { backgroundColor: '#0D6E3E', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  issueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardContainer: { gap: 12 },
  cardVisual: { backgroundColor: '#0D6E3E', borderRadius: 20, padding: 24, height: 180, justifyContent: 'space-between', shadowColor: '#0D6E3E', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  cardFrozen: { backgroundColor: '#475569' },
  cardBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  cardNumber: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 4, fontFamily: 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  cardValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  frozenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  frozenText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  limitText: { fontSize: 12, color: '#64748b' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  actionText: { fontWeight: '600', color: '#475569', fontSize: 14 },
  actionTextActive: { color: '#2563eb' },
});
