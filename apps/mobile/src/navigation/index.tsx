import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

// Auth screens
import { LoginScreen }    from '@/screens/auth/login.screen';
import { RegisterScreen } from '@/screens/auth/register.screen';
import { VerifyScreen }   from '@/screens/auth/verify.screen';

// App screens
import { DashboardScreen }    from '@/screens/dashboard/dashboard.screen';
import { SendScreen }         from '@/screens/send/send.screen';
import { ReceiveScreen }      from '@/screens/receive/receive.screen';
import { TransactionsScreen } from '@/screens/transactions/transactions.screen';
import { SettingsScreen }     from '@/screens/settings/settings.screen';
import { KYCScreen }          from '@/screens/kyc/kyc.screen';
import { TransactionDetailScreen } from '@/screens/transactions/transaction-detail.screen';
import { AddMoneyScreen }     from '@/screens/add-money/add-money.screen';
import { CardScreen }         from '@/screens/card/card.screen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🏠', Send: '📤', Receive: '📥', Transactions: '📋', Settings: '👤',
  };
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icons[name] ?? '●'}</Text>;
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#0D6E3E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2EDE8',
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Send"         component={SendScreen}          options={{ tabBarLabel: 'Enviar' }} />
      <Tab.Screen name="Receive"      component={ReceiveScreen}       options={{ tabBarLabel: 'Recibir' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen}  options={{ tabBarLabel: 'Historial' }} />
      <Tab.Screen name="Settings"     component={SettingsScreen}      options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth stack
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Verify"   component={VerifyScreen} />
          </>
        ) : (
          // App stack
          <>
            <Stack.Screen name="Tabs"              component={AppTabs} />
            <Stack.Screen name="KYC"               component={KYCScreen}
              options={{ presentation: 'modal', headerShown: true, title: 'Verificar identidad' }} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen}
              options={{ presentation: 'card', headerShown: true, title: 'Detalle' }} />
            <Stack.Screen name="AddMoney"          component={AddMoneyScreen}
              options={{ presentation: 'modal', headerShown: true, title: 'Agregar dinero' }} />
            <Stack.Screen name="Card"              component={CardScreen}
              options={{ presentation: 'card', headerShown: true, title: 'Tarjeta Mondega' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
