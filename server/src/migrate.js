const { pool } = require('./db');

const SQL = `
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  expo_push_token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Unnamed device',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'severe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acknowledgments (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alert_id, device_id)
);
`;

// Idempotent (CREATE TABLE IF NOT EXISTS), so it's safe to call this on every
// server boot — useful on Render's free plan, which has no shell access to
// run a one-off migration command.
async function runMigration() {
  await pool.query(SQL);
}

// Still runnable directly for local dev: `npm run migrate`.
if (require.main === module) {
  require('dotenv').config();
  runMigration()
    .then(async () => {
      // eslint-disable-next-line no-console
      console.log('Migration complete: devices, alerts, acknowledgments tables ready.');
      await pool.end();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
