import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore } from '@/store/wallet.store';
import { apiClient } from '@/services/api-client';
import { formatMondg, fromMondgUnits } from '@mondega/shared-utils';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { balance, transactions, setBalance, setTransactions } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        apiClient.get('/wallet/balance'),
        apiClient.get('/wallet/transactions?limit=5'),
      ]);
      setBalance(balRes.data);
      setTransactions(txRes.data.items);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const availableMondg = balance
    ? fromMondgUnits(BigInt(balance.availableMondg))
    : '0.00';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6E3E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}
            </Text>
            <Text style={styles.userName}>
              {user?.firstName ?? `···${user?.phoneNumber?.slice(-4)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]?.toUpperCase() ?? '👤'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponible</Text>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="large" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.balanceAmount}>₳ {parseFloat(availableMondg).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          )}
          <Text style={styles.balanceSub}>MONDG · Mondega Digital</Text>

          {/* Add money button */}
          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={() => navigation.navigate('AddMoney')}
          >
            <Text style={styles.addMoneyText}>+ Agregar dinero</Text>
          </TouchableOpacity>
        </View>

        {/* KYC banner */}
        {user && user.kycLevel < 2 && (
          <TouchableOpacity
            style={styles.kycBanner}
            onPress={() => navigation.navigate('KYC')}
          >
            <Text style={styles.kycBannerText}>
              🔐 Verifica tu identidad para límites mayores
            </Text>
            <Text style={styles.kycBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.quickActions}>
            {[
              { label: 'Enviar',  icon: '📤', screen: 'Send' },
              { label: 'Recibir', icon: '📥', screen: 'Receive' },
              { label: 'Agregar', icon: '💳', screen: 'AddMoney' },
              { label: 'Tarjeta', icon: '💴', screen: 'Card' },
            ].map(action => (
              <TouchableOpacity
                key={action.screen}
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={styles.quickActionIcon}>
                  <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Movimientos recientes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#0D6E3E" style={{ padding: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💸</Text>
              <Text style={styles.emptyText}>Aún no hay movimientos</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txItem}
                onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
              >
                <View style={[
                  styles.txIcon,
                  { backgroundColor: tx.direction === 'sent' ? '#FEE2E2' : '#DCFCE7' },
                ]}>
                  <Text style={{ fontSize: 18 }}>{tx.direction === 'sent' ? '📤' : '📥'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>
                    {tx.direction === 'sent' ? 'Enviado' : 'Recibido'}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: tx.direction === 'sent' ? '#DC2626' : '#16A34A' },
                ]}>
                  {tx.direction === 'sent' ? '-' : '+'}{fromMondgUnits(BigInt(tx.amountMondg ?? '0'), 2)} MONDG
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAF9' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  greeting:       { fontSize: 13, color: '#6B7280' },
  userName:       { fontSize: 22, fontWeight: '700', color: '#111827' },
  avatarBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 16 },
  balanceCard:    { marginHorizontal: 16, marginVertical: 12, backgroundColor: '#0D6E3E', borderRadius: 24, padding: 24 },
  balanceLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  balanceAmount:  { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  balanceSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4, marginBottom: 16 },
  addMoneyBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  addMoneyText:   { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  kycBanner:      { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFFBEB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  kycBannerText:  { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '500' },
  kycBannerArrow: { color: '#92400E', fontWeight: '700', fontSize: 16 },
  section:        { marginHorizontal: 16, marginVertical: 8 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll:         { fontSize: 13, color: '#0D6E3E', fontWeight: '600' },
  quickActions:   { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionBtn: { alignItems: 'center', flex: 1 },
  quickActionIcon:{ width: 56, height: 56, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginBottom: 6 },
  quickActionLabel:{ fontSize: 12, color: '#374151', fontWeight: '500' },
  txItem:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 8 },
  txIcon:         { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo:         { flex: 1 },
  txType:         { fontWeight: '600', color: '#111827', fontSize: 14 },
  txDate:         { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  txAmount:       { fontWeight: '700', fontSize: 15 },
  emptyState:     { alignItems: 'center', paddingVertical: 24 },
  emptyText:      { color: '#9CA3AF', fontSize: 14 },
});
