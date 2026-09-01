require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool } = require('./db');
const { sendToAllDevices } = require('./push');
const { runMigration } = require('./migrate');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

function requireAdminKey(req, res, next) {
  const key = req.header('X-Admin-Key');
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Invalid or missing X-Admin-Key' });
  }
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/devices', requireAdminKey, async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, expo_push_token, name, registered_at FROM devices ORDER BY registered_at DESC'
  );
  res.json(rows);
});

// --- Device registration -------------------------------------------------

app.post('/register', async (req, res) => {
  const { expoPushToken, name } = req.body || {};
  if (!expoPushToken) {
    return res.status(400).json({ error: 'expoPushToken is required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO devices (expo_push_token, name)
       VALUES ($1, $2)
       ON CONFLICT (expo_push_token) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, expo_push_token, name, registered_at`,
      [expoPushToken, name || 'Unnamed device']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// --- Sending an alert (admin only) ---------------------------------------

app.post('/alerts', requireAdminKey, async (req, res) => {
  const { title, body, severity } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO alerts (title, body, severity)
       VALUES ($1, $2, $3)
       RETURNING id, title, body, severity, created_at`,
      [title, body, severity || 'severe']
    );
    const alert = rows[0];
    const pushResult = await sendToAllDevices({
      alertId: alert.id,
      title: alert.title,
      body: alert.body,
    });
    res.status(201).json({ alert, push: pushResult });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to create/send alert' });
  }
});

app.get('/alerts', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, body, severity, created_at FROM alerts ORDER BY created_at DESC LIMIT 50'
  );
  res.json(rows);
});

// --- Acknowledgment --------------------------------------------------------

app.post('/alerts/:id/ack', async (req, res) => {
  const alertId = Number(req.params.id);
  const { expoPushToken } = req.body || {};
  if (!expoPushToken) {
    return res.status(400).json({ error: 'expoPushToken is required' });
  }
  try {
    const { rows: deviceRows } = await pool.query(
      'SELECT id FROM devices WHERE expo_push_token = $1',
      [expoPushToken]
    );
    if (deviceRows.length === 0) {
      return res.status(404).json({ error: 'Device not registered' });
    }
    const deviceId = deviceRows[0].id;
    await pool.query(
      `INSERT INTO acknowledgments (alert_id, device_id)
       VALUES ($1, $2)
       ON CONFLICT (alert_id, device_id) DO NOTHING`,
      [alertId, deviceId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Failed to record acknowledgment' });
  }
});

app.get('/alerts/:id/acks', async (req, res) => {
  const alertId = Number(req.params.id);
  const { rows } = await pool.query(
    `SELECT d.id AS device_id, d.name, a.acked_at
     FROM acknowledgments a
     JOIN devices d ON d.id = a.device_id
     WHERE a.alert_id = $1
     ORDER BY a.acked_at ASC`,
    [alertId]
  );
  res.json(rows);
});

const PORT = process.env.PORT || 3000;

runMigration()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Migration check complete (tables ready).');
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`cellbodcast server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Startup migration failed — server not starting:', err);
    process.exit(1);
  });
