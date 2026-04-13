import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/api-client';

type Step = 'recipient' | 'amount' | 'quote' | 'pin' | 'success';

export function SendScreen() {
  const navigation = useNavigation<any>();

  const [step, setStep]         = useState<Step>('recipient');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]       = useState('');
  const [pin, setPin]             = useState('');
  const [description, setDescription] = useState('');
  const [quote, setQuote]         = useState<any>(null);
  const [txId, setTxId]           = useState('');
  const [loading, setLoading]     = useState(false);

  async function fetchQuote() {
    setLoading(true);
    try {
      const res = await apiClient.post('/fx/quote', {
        fromCoin: 'QUETZA',
        toCoin: 'QUETZA',
        fromAmount: parseFloat(amount),
      });
      setQuote(res.data);
      setStep('quote');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo obtener cotización');
    } finally {
      setLoading(false);
    }
  }

  async function confirmTransfer() {
    if (pin.length < 6) {
      Alert.alert('PIN', 'Ingresa tu PIN de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/wallet/transfer', {
        toIdentifier: recipient,
        amountMondg: amount,
        description,
        quoteId: quote?.quoteId,
        pin,
      });
      setTxId(res.data.id);
      setStep('success');
    } catch (err: any) {
      Alert.alert('Error al enviar', err.response?.data?.message ?? 'Intenta de nuevo');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 'recipient' ? navigation.goBack() : setStep(prev =>
            prev === 'amount' ? 'recipient' : prev === 'quote' ? 'amount' : 'recipient'
          )}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Enviar dinero</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Step: Recipient */}
          {step === 'recipient' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>¿A quién envías?</Text>
              <Text style={styles.stepSub}>Teléfono, ID o dirección de wallet</Text>

              <TextInput
                style={styles.input}
                placeholder="+502 1234-5678 o 0x..."
                value={recipient}
                onChangeText={setRecipient}
                keyboardType="phone-pad"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.btnPrimary, !recipient && styles.btnDisabled]}
                onPress={() => recipient && setStep('amount')}
                disabled={!recipient}
              >
                <Text style={styles.btnPrimaryText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Amount */}
          {step === 'amount' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>¿Cuánto envías?</Text>
              <Text style={styles.stepSub}>Enviando a {recipient.slice(0, 12)}...</Text>

              <View style={styles.amountContainer}>
                <Text style={styles.currency}>₳</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.coin}>MONDG</Text>
              </View>

              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                placeholder="Descripción (opcional)"
                value={description}
                onChangeText={setDescription}
                maxLength={100}
              />

              <TouchableOpacity
                style={[styles.btnPrimary, (!amount || loading) && styles.btnDisabled]}
                onPress={fetchQuote}
                disabled={!amount || loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.btnPrimaryText}>Ver cotización</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Quote */}
          {step === 'quote' && quote && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Confirmar envío</Text>

              <View style={styles.quoteCard}>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Envías</Text>
                  <Text style={styles.quoteValue}>{quote.fromAmount} {quote.fromCoin}</Text>
                </View>
                <View style={styles.quoteDivider} />
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Recibe</Text>
                  <Text style={[styles.quoteValue, { color: '#16A34A' }]}>{quote.toAmount.toFixed(2)} {quote.toCoin}</Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Tasa</Text>
                  <Text style={styles.quoteSmall}>{quote.rateDisplay}</Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Comisión</Text>
                  <Text style={styles.quoteSmall}>{quote.feeAmount.toFixed(4)} ({(quote.feePercent).toFixed(1)}%)</Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Equivalente USD</Text>
                  <Text style={styles.quoteSmall}>${quote.usdEquivalent.toFixed(2)}</Text>
                </View>
              </View>

              <Text style={styles.stepTitle}>Tu PIN de 6 dígitos</Text>
              <TextInput
                style={styles.pinInput}
                placeholder="• • • • • •"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.btnPrimary, (pin.length < 6 || loading) && styles.btnDisabled]}
                onPress={confirmTransfer}
                disabled={pin.length < 6 || loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.btnPrimaryText}>Enviar ahora</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <View style={[styles.stepContainer, styles.successContainer]}>
              <View style={styles.successIcon}>
                <Text style={{ fontSize: 48 }}>✓</Text>
              </View>
              <Text style={styles.successTitle}>¡Enviado!</Text>
              <Text style={styles.successSub}>{amount} MONDG enviados a {recipient.slice(0, 12)}...</Text>
              <Text style={styles.txIdText}>TX: {txId}</Text>

              <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Dashboard')}>
                <Text style={styles.btnPrimaryText}>Volver al inicio</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAF9' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:        { fontSize: 24, color: '#0D6E3E', width: 32 },
  title:          { fontSize: 18, fontWeight: '700', color: '#111827' },
  stepContainer:  { padding: 20 },
  stepTitle:      { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  stepSub:        { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input:          { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2EDE8', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  amountContainer:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2, borderColor: '#0D6E3E', paddingHorizontal: 20, paddingVertical: 16, marginBottom: 0 },
  currency:       { fontSize: 28, color: '#0D6E3E', fontWeight: '700', marginRight: 8 },
  amountInput:    { flex: 1, fontSize: 36, fontWeight: '700', color: '#111827' },
  coin:           { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  btnPrimary:     { backgroundColor: '#0D6E3E', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  btnDisabled:    { opacity: 0.4 },
  quoteCard:      { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2EDE8' },
  quoteRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  quoteLabel:     { color: '#6B7280', fontSize: 14 },
  quoteValue:     { fontWeight: '700', fontSize: 16, color: '#111827' },
  quoteSmall:     { fontWeight: '600', fontSize: 14, color: '#374151' },
  quoteDivider:   { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  pinInput:       { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2EDE8', paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, letterSpacing: 8, textAlign: 'center', marginTop: 8 },
  successContainer:{ alignItems: 'center', paddingTop: 60 },
  successIcon:    { width: 100, height: 100, backgroundColor: '#DCFCE7', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle:   { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8 },
  successSub:     { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  txIdText:       { fontSize: 11, color: '#9CA3AF', marginBottom: 32, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
