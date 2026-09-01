import { BACKEND_URL } from './config';

export async function registerDevice(expoPushToken, name) {
  const res = await fetch(`${BACKEND_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expoPushToken, name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Registration failed (${res.status})`);
  }
  return res.json();
}

export async function acknowledgeAlert(alertId, expoPushToken) {
  const res = await fetch(`${BACKEND_URL}/alerts/${alertId}/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expoPushToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Acknowledge failed (${res.status})`);
  }
  return res.json();
}
