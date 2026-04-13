import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';

interface KYCStatus {
  kycLevel: number;
  kycStatus: string;
  limits: { dailyUSD: number; monthlyUSD: number };
  requiredDocuments?: string[];
  redirectUrl?: string;
}

const LEVELS = [
  { level: 0, name: 'Anónimo',     color: '#94a3b8', desc: 'Sin verificación. Límites muy bajos.' },
  { level: 1, name: 'Básico',      color: '#d97706', desc: 'Teléfono verificado. $500/día.' },
  { level: 2, name: 'Verificado',  color: '#0D6E3E', desc: 'ID + selfie. $5,000/día.' },
  { level: 3, name: 'Empresarial', color: '#7c3aed', desc: 'Documentos empresa. $50,000/día.' },
];

export function KYCScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: async () => {
      const res = await apiClient.get('/kyc/status');
      return res.data as KYCStatus;
    },
  });

  const initiate = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/kyc/initiate');
      return res.data as { redirectUrl: string };
    },
    onSuccess: ({ redirectUrl }) => {
      Linking.openURL(redirectUrl);
    },
  });

  if (isLoading) return <ActivityIndicator size="large" color="#0D6E3E" style={{ marginTop: 60 }} />;

  const currentLevel = data?.kycLevel ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Verificación de Identidad</Text>
        <Text style={styles.subtitle}>GAFILAT / FATF compliant</Text>
      </View>

      {/* Level progress */}
      <View style={styles.card}>
        {LEVELS.map((lvl, i) => {
          const isActive = currentLevel === lvl.level;
          const isDone = currentLevel > lvl.level;
          return (
            <View key={lvl.level} style={[styles.levelRow, i < LEVELS.length - 1 && styles.levelRowBorder]}>
              <View style={[styles.levelDot, { backgroundColor: isDone || isActive ? lvl.color : '#e2e8f0' }]}>
                <Text style={styles.levelDotText}>{isDone ? '✓' : String(lvl.level)}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, isActive && { color: lvl.color }]}>
                  {lvl.name} {isActive && '← Actual'}
                </Text>
                <Text style={styles.levelDesc}>{lvl.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Limits */}
      {data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Límites actuales</Text>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Diario</Text>
            <Text style={styles.limitValue}>${data.limits.dailyUSD.toLocaleString()} USD</Text>
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Mensual</Text>
            <Text style={styles.limitValue}>${data.limits.monthlyUSD.toLocaleString()} USD</Text>
          </View>
        </View>
      )}

      {/* Status / CTA */}
      {data?.kycStatus === 'in_review' ? (
        <View style={styles.inReviewCard}>
          <Text style={styles.inReviewIcon}>⏳</Text>
          <Text style={styles.inReviewTitle}>Verificación en proceso</Text>
          <Text style={styles.inReviewDesc}>Tu solicitud está siendo revisada (24–48 hrs). Te notificaremos por SMS.</Text>
        </View>
      ) : currentLevel < 2 ? (
        <TouchableOpacity
          style={styles.cta}
          onPress={() => initiate.mutate()}
          disabled={initiate.isPending}
        >
          {initiate.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Verificar ahora — subir a Nivel {currentLevel + 1}</Text>
          }
        </TouchableOpacity>
      ) : (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedText}>✅ Identidad verificada</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  header: { paddingVertical: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  levelRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  levelDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  levelDotText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  levelDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  limitLabel: { fontSize: 14, color: '#64748b' },
  limitValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  inReviewCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  inReviewIcon: { fontSize: 32, marginBottom: 8 },
  inReviewTitle: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  inReviewDesc: { fontSize: 13, color: '#3b82f6', textAlign: 'center', marginTop: 6 },
  cta: { backgroundColor: '#0D6E3E', borderRadius: 16, padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  verifiedBanner: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 16, alignItems: 'center' },
  verifiedText: { color: '#16a34a', fontWeight: '700', fontSize: 16 },
});
