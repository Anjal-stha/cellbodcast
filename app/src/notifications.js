import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Show alerts full-blast even while the app is in the foreground — a real
// emergency alert shouldn't stay silently in the notification tray.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNEL_ID = 'emergency-alerts';

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      // Bypasses most "do not disturb"-adjacent quiet settings; a device's own
      // system-level DND can still suppress it — see README limitations.
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      sound: 'default',
    });
  }
}

/**
 * Requests permission and returns an Expo push token, or null if the user
 * denied permission or this is running on a simulator (which can't get a
 * real push token).
 */
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Notification permission was not granted.');
    return null;
  }

  await setupNotificationChannel();

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  return tokenResponse.data;
}
