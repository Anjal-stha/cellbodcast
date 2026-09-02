# cellbodcast app (Expo React Native)

Registers this phone with the backend and shows a full-screen emergency alert
(with sound/vibration) when the admin pushes one, with an "I understand"
button that acknowledges it.

## Setup

1. Point the app at your backend in [`src/config.js`](src/config.js) — set
   `BACKEND_URL` to your deployed Render URL (or `http://<your-computer-LAN-IP>:3000`
   for local dev on a real device, since `localhost` on the phone means the
   phone itself).
2. **Android requires your own Firebase project** — since Expo removed shared
   FCM credentials, `expo-notifications` needs a real `google-services.json`
   plus a Firebase service account key uploaded to Expo, or you'll get
   *"Unable to get Firebase Messaging instance"* on the device and every
   server-side push will be rejected. One-time setup:
   1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
   2. **Project settings → Your apps → Add app (Android)** — package name
      must exactly match `android.package` in [`app.json`](app.json)
      (currently `com.anjal0001.cellbodcast`). Download `google-services.json`
      and place it at `app/google-services.json` (already wired up via
      `android.googleServicesFile` in `app.json`).
   3. **Project settings → Service accounts → Generate new private key** —
      downloads a second JSON file (a real secret — never commit it; it's
      covered by `.gitignore`'s `*firebase-adminsdk*.json` pattern).
   4. Run `npx eas-cli credentials -p android` → select your build profile →
      **Google Service Account** → **Manage your Google Service Account Key
      for Push Notifications (FCM V1)** → **Set up a Google Service Account
      Key for Push Notifications (FCM V1)** → paste the path to that service
      account JSON. This is interactive (arrow-key menus) — run it in your
      own terminal, not scripted.
3. Link the app to an EAS project (already done in this repo — `app.json` has
   `extra.eas.projectId` and `owner` set from a prior `npx eas-cli init --force`).
   If you fork this to your own Expo account, re-run that to get your own
   project id.

## Build & install (no dev server needed)

We use the **`preview`** profile ([`eas.json`](eas.json)) — a standalone APK
with everything baked in, so you just install and open it, no laptop/Metro
connection required:

```bash
npx eas-cli login              # once, interactive
npx eas-cli build --profile preview --platform android --non-interactive
```

When it finishes, it prints an `expo.dev/.../builds/<id>` link — open that on
the phone's browser (or scan the QR code) to download and install the APK.
Android will prompt to allow installing from that source the first time.

Rebuild and reinstall any time native config changes (e.g. `google-services.json`,
`app.json` android/ios blocks) — a JS-only change doesn't need a full rebuild
if you're using `development`/dev-client instead, but `preview` bakes the JS
in too, so just rebuild.

**Other profiles** (see `eas.json`):
- `development` — a dev-client APK that connects live to `npx expo start
  --dev-client` on your laptop; for active coding with instant reload.
- `production` — for an actual Play Store submission (`.aab`, auto-incrementing
  version).

**iOS note:** push notifications need a paid Apple Developer Program
membership ($99/yr) to get an APNs credential — there's no free-tier
equivalent to Android's FCM here. Without it, you can still build/run on an
iPhone via Xcode for free, but pushes won't be delivered.

## Local JS-only dev (optional)

```bash
npm install
npx expo start --dev-client   # only useful if you built the `development` profile
```

## What it does

- On first launch, asks for notification permission, gets an Expo push token,
  and registers it with the backend under the name you type
  ([`App.js`](App.js), [`src/notifications.js`](src/notifications.js)).
- Listens for incoming notifications (foreground and tapped-from-background)
  and opens [`src/EmergencyAlertModal.js`](src/EmergencyAlertModal.js) — a
  full-screen red/orange banner — regardless of app state. **Tap the
  notification** to open the full-screen modal; a notification that only
  vibrates/sounds in the tray without being tapped hasn't opened the app yet.
- Tapping "I understand" calls `POST /alerts/:id/ack` on the backend and
  dismisses the modal.

## Troubleshooting

- **"Unable to get Firebase Messaging instance"** on the device → the APK was
  built without `google-services.json` wired up, or you're running an old
  APK from before it was added. Confirm `app.json` has `android.googleServicesFile`
  set, rebuild, and make sure you install the *new* build (uninstall the old
  one first if unsure — a cached download in your phone's Downloads folder is
  an easy way to accidentally reinstall the old one).
- **Push reported as sent but nothing arrives** → check the backend's
  `POST /alerts` response `push.results[].status`. If it's `"error"`, the
  `message` field has the real reason (e.g. Expo API validation errors like a
  malformed `interruptionLevel`). If it's `"ok"`, delivery succeeded — check
  your phone's notification shade; it may have arrived silently if the app
  isn't in the foreground and you just didn't notice it land.
