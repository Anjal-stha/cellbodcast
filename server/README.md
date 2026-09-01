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
- `POST /alerts` `{ title, body, severity }` — header `X-Admin-Key: <ADMIN_KEY>`
- `GET /alerts`
- `POST /alerts/:id/ack` `{ expoPushToken }`
- `GET /alerts/:id/acks`
