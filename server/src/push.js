const { Expo } = require('expo-server-sdk');
const { pool } = require('./db');

const expo = new Expo();

/**
 * Sends `title`/`body` to every registered device via Expo Push, prunes
 * tokens Expo reports as no-longer-registered (app uninstalled etc.), and
 * returns a small summary for the caller/admin page.
 */
async function sendToAllDevices({ alertId, title, body }) {
  const { rows: devices } = await pool.query(
    'SELECT id, expo_push_token FROM devices'
  );

  const messages = [];
  for (const device of devices) {
    if (!Expo.isExpoPushToken(device.expo_push_token)) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping invalid Expo push token for device ${device.id}`);
      continue;
    }
    messages.push({
      to: device.expo_push_token,
      sound: 'default',
      priority: 'high',
      title,
      body,
      data: { alertId },
      // Android: use our high-importance emergency channel (configured client-side).
      channelId: 'emergency-alerts',
      // iOS: prominent but doesn't require Apple's restricted Critical Alerts entitlement.
      interruptionLevel: 'timeSensitive',
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error sending push chunk:', err);
    }
  }

  // Prune tokens Expo says are dead.
  const deadTokens = [];
  tickets.forEach((ticket, i) => {
    if (
      ticket.status === 'error' &&
      ticket.details &&
      ticket.details.error === 'DeviceNotRegistered'
    ) {
      deadTokens.push(messages[i].to);
    }
  });
  if (deadTokens.length > 0) {
    await pool.query(
      'DELETE FROM devices WHERE expo_push_token = ANY($1::text[])',
      [deadTokens]
    );
  }

  return { sent: messages.length, pruned: deadTokens.length };
}

module.exports = { sendToAllDevices };
