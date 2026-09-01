# cellbodcast

A small-scale simulation of a **cell broadcast emergency alert system** — the
kind governments use to push emergency messages (earthquake, tsunami, flood,
etc.) to every phone in range of a cell tower. We don't have access to real
cell tower infrastructure, so this recreates the same *experience* using
real push notifications instead: an admin triggers an alert from a backend,
and it pops up full-screen — with sound and vibration — on every phone
that's registered, with an "I understand" button to acknowledge it.

This is an MVP with one function end to end: **register a phone → push an
alert → it appears full-screen on the target device → user acknowledges it.**

## How it's built

- **`/server`** — Node.js + Express + Postgres backend, deployed on Render.
  Holds registered devices, stores/sends alerts via Expo's push service, and
  records acknowledgments. See [server/README.md](server/README.md) for setup,
  local dev, deployment, and the full API reference.
- **`/app`** — Expo (React Native) mobile app. Registers the device, listens
  for incoming alerts in the foreground and background, and shows the
  full-screen alert modal. See [app/README.md](app/README.md) for setup,
  running locally, and the EAS build steps needed for real push notifications.

Read those two READMEs for anything implementation-specific — this file is
just the overview.

## Pros

- Free to run at small scale — Render's free tier + Expo's free push service
  + Android's free FCM cover the whole stack, no paid infrastructure needed.
- Alerts arrive even when the app is backgrounded (not just while open),
  thanks to real push notifications rather than a foreground-only connection.
- Full-screen, high-priority, sound + vibration alert UI — visually close to
  a real WEA/EAS-style alert, with an explicit acknowledge step.
- Simple, inspectable stack (plain Express + Postgres + Expo) — easy to
  extend (severity levels, alert history, admin auth, etc.).

## Cons / limitations vs. a real Cell Broadcast system

- Needs internet connectivity and a phone that has already registered a push
  token — real Cell Broadcast needs neither; it's broadcast at the cell
  tower/baseband level to every phone in range, registered or not.
- No geotargeting — real alerts only go to phones near specific towers; this
  MVP broadcasts to every registered device regardless of location.
- iOS push requires a paid Apple Developer Program membership ($99/yr) to get
  an APNs credential — Android has no equivalent cost (FCM is free), so iOS
  support depends on that enrollment.
- Some Android OEMs aggressively kill backgrounded apps, which can delay or
  drop a push — not an issue with real Cell Broadcast.
- True silent-mode/Do-Not-Disturb override and lock-screen takeover need extra
  native Android work beyond what's in this MVP (see server/app READMEs for
  what's implemented today vs. flagged as a fast-follow).
- Render's free web service spins down after inactivity, adding a cold-start
  delay to the first alert after idling.
