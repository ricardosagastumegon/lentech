// Firebase configuration for React Native (Expo)
// Uses @react-native-firebase/app — native module (not web SDK)
// Project: lentech-216a0

// For React Native Firebase you configure via:
//  Android: google-services.json  (download from Firebase Console)
//  iOS:     GoogleService-Info.plist

// The config below is used as reference / fallback only.
// The actual credentials come from the native config files above.

export const FIREBASE_PROJECT_ID = 'lentech-216a0';

/**
 * To set up:
 * 1. Firebase Console → Configuración del proyecto → Tus aplicaciones
 * 2. Agrega aplicación Android (package: com.mondega.app)
 *    → Descarga google-services.json → coloca en apps/mobile/android/app/
 * 3. Agrega aplicación iOS (bundle ID: com.mondega.app)
 *    → Descarga GoogleService-Info.plist → coloca en apps/mobile/ios/
 * 4. Instala: pnpm add @react-native-firebase/app @react-native-firebase/messaging
 * 5. Para Expo: usar expo-notifications en lugar de @react-native-firebase
 */

// If using expo-notifications (simpler, recommended for Expo):
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: FIREBASE_PROJECT_ID,
  });

  return token.data;
}
