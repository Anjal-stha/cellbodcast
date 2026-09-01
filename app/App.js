import { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { registerForPushNotificationsAsync, setupNotificationChannel } from './src/notifications';
import { registerDevice, acknowledgeAlert } from './src/api';
import { getStoredRegistration, saveRegistration } from './src/storage';
import EmergencyAlertModal from './src/EmergencyAlertModal';

export default function App() {
  const [pushToken, setPushToken] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [status, setStatus] = useState('loading'); // loading | needsName | registering | registered | error
  const [errorMessage, setErrorMessage] = useState('');
  const [activeAlert, setActiveAlert] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();

  // On launch: set up the Android channel, check for an already-registered
  // token, otherwise wait for the user to type a name before registering.
  useEffect(() => {
    (async () => {
      await setupNotificationChannel();
      const { pushToken: storedToken, deviceName: storedName } = await getStoredRegistration();
      if (storedToken) {
        setPushToken(storedToken);
        setDeviceName(storedName || 'Unnamed device');
        setStatus('registered');
      } else {
        setStatus('needsName');
      }
    })();
  }, []);

  // Foreground notification -> pop the full-screen modal immediately.
  // Tapped notification (background/killed) -> same, via the response listener.
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      openAlertFromNotification(notification.request.content);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      openAlertFromNotification(response.notification.request.content);
    });
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  function openAlertFromNotification(content) {
    const alertId = content.data?.alertId;
    setActiveAlert({
      id: alertId,
      title: content.title,
      body: content.body,
      severity: content.data?.severity || 'severe',
    });
  }

  const handleRegister = useCallback(async () => {
    const name = nameInput.trim() || 'Unnamed device';
    setStatus('registering');
    setErrorMessage('');
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        setErrorMessage(
          'Could not get a push token. Push notifications require a physical device with notification permission granted.'
        );
        setStatus('needsName');
        return;
      }
      await registerDevice(token, name);
      await saveRegistration(token, name);
      setPushToken(token);
      setDeviceName(name);
      setStatus('registered');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('needsName');
    }
  }, [nameInput]);

  const handleAcknowledge = useCallback(
    async (alert) => {
      if (!pushToken) return;
      setAcknowledging(true);
      try {
        if (alert.id) {
          await acknowledgeAlert(alert.id, pushToken);
        }
      } catch (err) {
        console.warn('Failed to record acknowledgment:', err.message);
      } finally {
        setAcknowledging(false);
        setActiveAlert(null);
      }
    },
    [pushToken]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.heading}>📡 cellbodcast</Text>
      <Text style={styles.subheading}>Mini emergency alert receiver</Text>

      {status === 'loading' && <ActivityIndicator style={{ marginTop: 24 }} />}

      {(status === 'needsName' || status === 'registering') && (
        <View style={styles.form}>
          <Text style={styles.label}>Give this device a name to register it:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Anjal's Phone"
            value={nameInput}
            onChangeText={setNameInput}
            editable={status !== 'registering'}
          />
          <Pressable
            style={[styles.button, status === 'registering' && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={status === 'registering'}
          >
            <Text style={styles.buttonText}>
              {status === 'registering' ? 'Registering…' : 'Register This Phone'}
            </Text>
          </Pressable>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        </View>
      )}

      {status === 'registered' && (
        <View style={styles.form}>
          <Text style={styles.registeredText}>✅ Registered as "{deviceName}"</Text>
          <Text style={styles.hint}>
            This device will receive a full-screen alert when an admin sends one.
            Keep the app installed (background is fine).
          </Text>
        </View>
      )}

      <EmergencyAlertModal
        alert={activeAlert}
        onAcknowledge={handleAcknowledge}
        acknowledging={acknowledging}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  heading: { fontSize: 28, fontWeight: '800' },
  subheading: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 24 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#c0392b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#c0392b', marginTop: 12, fontSize: 13 },
  registeredText: { fontSize: 16, fontWeight: '700', color: '#27ae60', marginBottom: 8 },
  hint: { fontSize: 13, color: '#666', lineHeight: 18 },
});
