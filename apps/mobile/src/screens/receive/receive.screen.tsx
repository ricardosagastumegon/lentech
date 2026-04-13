import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Share, Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api-client';

interface Wallet {
  coin: string;
  blockchainAddress: string;
  balance: string;
}

export function ReceiveScreen() {
  const [selectedCoin, setSelectedCoin] = useState('QUETZA');

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const res = await apiClient.get('/wallets');
      return res.data.wallets as Wallet[];
    },
  });

  const wallet = wallets.find(w => w.coin === selectedCoin) ?? wallets[0];

  function copyAddress() {
    if (!wallet) return;
    Clipboard.setString(wallet.blockchainAddress);
    Alert.alert('Copiado', 'Dirección copiada al portapapeles');
  }

  async function shareAddress() {
    if (!wallet) return;
    await Share.share({
      message: `Mi dirección Mondega (${wallet.coin}):\n${wallet.blockchainAddress}`,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recibir</Text>
      <Text style={styles.subtitle}>Comparte tu dirección para recibir monedas digitales</Text>

      {/* Coin selector */}
      <View style={styles.chipRow}>
        {wallets.map(w => (
          <TouchableOpacity
            key={w.coin}
            style={[styles.chip, selectedCoin === w.coin && styles.chipActive]}
            onPress={() => setSelectedCoin(w.coin)}
          >
            <Text style={[styles.chipText, selectedCoin === w.coin && styles.chipTextActive]}>
              {w.coin}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {wallet && (
        <View style={styles.card}>
          {/* QR Placeholder — integrate react-native-qrcode-svg in production */}
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR</Text>
            <Text style={styles.qrSub}>{wallet.coin}</Text>
          </View>

          <Text style={styles.addressLabel}>Dirección de wallet</Text>
          <Text style={styles.address} selectable>{wallet.blockchainAddress}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btn} onPress={copyAddress}>
              <Text style={styles.btnText}>Copiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={shareAddress}>
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          ⚠️ Solo envía {selectedCoin} a esta dirección. Enviar otros activos podría resultar en pérdida permanente.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#0D6E3E', borderColor: '#0D6E3E' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', gap: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  qrPlaceholder: { width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0D6E3E', borderStyle: 'dashed' },
  qrText: { fontSize: 32, fontWeight: '800', color: '#0D6E3E' },
  qrSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, alignSelf: 'flex-start' },
  address: { fontSize: 12, fontFamily: 'monospace', color: '#1e293b', textAlign: 'center', lineHeight: 18, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, width: '100%' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0D6E3E' },
  btnText: { fontWeight: '700', color: '#475569', fontSize: 14 },
  btnTextPrimary: { color: '#fff' },
  notice: { backgroundColor: '#fefce8', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fef08a' },
  noticeText: { fontSize: 12, color: '#854d0e', lineHeight: 18 },
});
