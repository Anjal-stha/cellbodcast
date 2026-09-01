import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PUSH_TOKEN: 'cellbodcast.pushToken',
  DEVICE_NAME: 'cellbodcast.deviceName',
};

export async function getStoredRegistration() {
  const [pushToken, deviceName] = await Promise.all([
    AsyncStorage.getItem(KEYS.PUSH_TOKEN),
    AsyncStorage.getItem(KEYS.DEVICE_NAME),
  ]);
  return { pushToken, deviceName };
}

export async function saveRegistration(pushToken, deviceName) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.PUSH_TOKEN, pushToken),
    AsyncStorage.setItem(KEYS.DEVICE_NAME, deviceName),
  ]);
}
