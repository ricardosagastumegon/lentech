import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api-client';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [notifEnabled, setNotifEnabled] = React.useState(true);

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/logout');
          } catch {}
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          logout();
        },
      },
    ]);
  }

  const sections = [
    {
      title: 'Cuenta',
      items: [
        { label: 'Verificación KYC', onPress: () => navigation.navigate('KYC') },
        { label: 'Cambiar PIN',      onPress: () => navigation.navigate('ChangePin') },
        { label: 'Seguridad 2FA',    onPress: () => navigation.navigate('TwoFA') },
      ],
    },
    {
      title: 'Preferencias',
      items: [
        {
          label: 'Notificaciones push',
          right: (
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ true: '#0D6E3E' }}
            />
          ),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Términos de servicio',    onPress: () => {} },
        { label: 'Política de privacidad',  onPress: () => {} },
        { label: 'Política AML/KYC',        onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.firstName?.[0] ?? user?.phoneNumber?.[3] ?? 'M').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.firstName ?? 'Usuario'} {user?.lastName ?? ''}</Text>
        <Text style={styles.phone}>{user?.phoneNumber}</Text>
        <View style={styles.kycBadge}>
          <Text style={styles.kycText}>KYC Nivel {user?.kycLevel ?? 0}</Text>
        </View>
      </View>

      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.item, idx < section.items.length - 1 && styles.itemBorder]}
                onPress={'onPress' in item ? item.onPress : undefined}
                activeOpacity={'onPress' in item ? 0.7 : 1}
              >
                <Text style={styles.itemLabel}>{item.label}</Text>
                {'right' in item ? item.right : (
                  'onPress' in item ? <Text style={styles.chevron}>›</Text> : null
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Mondega v1.0.0 • {user?.country}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0D6E3E', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  phone: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  kycBadge: { marginTop: 8, backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  kycText: { color: '#16a34a', fontWeight: '600', fontSize: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemLabel: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  chevron: { color: '#94a3b8', fontSize: 20 },
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: '#cbd5e1', fontSize: 11 },
});
