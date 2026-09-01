import { Modal, View, Text, StyleSheet, Pressable, Vibration } from 'react-native';
import { useEffect } from 'react';

const SEVERITY_COLORS = {
  test: '#f39c12',
  severe: '#c0392b',
  extreme: '#8e0000',
};

/**
 * Full-screen, hard-to-miss alert — styled like a real WEA/EAS banner.
 * `alert` is { id, title, body, severity } or null (hidden when null).
 */
export default function EmergencyAlertModal({ alert, onAcknowledge, acknowledging }) {
  useEffect(() => {
    if (alert) {
      // Extra vibration burst on top of the notification's own vibration
      // pattern, since this modal can also open from a foreground push.
      Vibration.vibrate([0, 500, 250, 500, 250, 500]);
    }
    return () => Vibration.cancel();
  }, [alert]);

  if (!alert) return null;

  const color = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.severe;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: color }]}>
        <Text style={styles.siren}>🚨</Text>
        <Text style={styles.label}>{(alert.severity || 'severe').toUpperCase()} EMERGENCY ALERT</Text>
        <Text style={styles.title}>{alert.title}</Text>
        <Text style={styles.body}>{alert.body}</Text>

        <Pressable
          style={styles.button}
          disabled={acknowledging}
          onPress={() => onAcknowledge(alert)}
        >
          <Text style={styles.buttonText}>
            {acknowledging ? 'Acknowledging…' : 'I Understand'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  siren: { fontSize: 64, marginBottom: 12 },
  label: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: '#fff',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#111',
  },
});
