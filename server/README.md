# cellbodcast-server

Backend for the mini cell-broadcast-style emergency alert MVP. Registers phones
(by Expo push token), lets an admin push an alert to all of them via Expo Push
(→ FCM/APNs), and records acknowledgments.

## Local dev

```bash
cp .env.example .env      # then fill in DATABASE_URL (a local Postgres) and ADMIN_KEY
npm install
npm run migrate           # creates devices / alerts / acknowledgments tables
npm run dev
```

Visit `http://localhost:3000/admin.html` to send a test alert once at least one
device has registered.

## Deploy to Render (free tier)

1. Push this repo to GitHub.
2. In Render: **New > PostgreSQL** — create a free Postgres instance, copy its
   **Internal Database URL**.
3. In Render: **New > Web Service** — point it at this repo, set:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Env vars: `DATABASE_URL` (from step 2), `ADMIN_KEY` (pick a strong random value)
4. The server runs the (idempotent) migration automatically on every boot —
   see `runMigration()` in `src/index.js` — so the tables get created on first
   deploy with no manual step. (This also means Render's free plan, which has
   no shell access, doesn't need it.)
5. Your API is now at `https://<your-service>.onrender.com`. The admin page is
   at `/admin.html`.

Note: Render's free web services spin down after inactivity and take a few
seconds to wake on the next request — expect a cold-start delay on the first
alert after idling.

## API

- `POST /register` `{ expoPushToken, name }`
- `POST /alerts` `{ title, body, severity }` — header `X-Admin-Key: <ADMIN_KEY>` —
  fans out a push to every registered device and returns
  `{ alert, push: { sent, pruned, results } }`, where `results[]` shows each
  device's actual Expo ticket status (`"ok"` or `"error"` with a `message`) —
  check this first if an alert isn't arriving.
- `GET /alerts`
- `POST /alerts/:id/ack` `{ expoPushToken }`
- `GET /alerts/:id/acks`
- `GET /devices` — header `X-Admin-Key: <ADMIN_KEY>` — list all registered devices
- `DELETE /devices/:id` — header `X-Admin-Key: <ADMIN_KEY>` — remove a device
  (e.g. a stale/test registration); there's no self-serve unregister yet, so
  this is currently the only way to remove a subscriber

## Android push notes

`expo-server-sdk`'s push payload must use Expo's exact field values — e.g.
`interruptionLevel` must be `time-sensitive` (kebab-case), not `timeSensitive`.
A malformed field causes Expo to reject the *entire* request before it ever
reaches FCM/APNs, and the failure only surfaces in `push.results[].message`,
not as an HTTP error on `POST /alerts` (that call still returns 201). Always
check `results[]` on the response, not just `push.sent`, when debugging
delivery.

Android delivery separately requires the *receiving app* to be built with a
real Firebase project's `google-services.json` and its service account key
uploaded to Expo — see [`/app/README.md`](../app/README.md) for that setup.
Without it, sends fail server-side with an Expo API validation/credential
error, not silently.
