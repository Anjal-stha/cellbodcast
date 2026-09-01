# cellbodcast app (Expo React Native)

Registers this phone with the backend and shows a full-screen emergency alert
(with sound/vibration) when the admin pushes one, with an "I understand"
button that acknowledges it.

## Setup

1. Point the app at your backend in [`src/config.js`](src/config.js) — set
   `BACKEND_URL` to your deployed Render URL (or `http://<your-computer-LAN-IP>:3000`
   for local dev on a real device, since `localhost` on the phone means the
   phone itself).
2. Push notifications need a real Expo project id once you leave Expo Go —
   run `npx eas init` (creates/links an EAS project) so `getExpoPushTokenAsync`
   can resolve one automatically.

   **Important:** since Expo SDK 53, **Expo Go no longer supports remote push
   notifications on Android** (iOS Expo Go still works for now, but Expo's own
   guidance is not to rely on it). For real testing on both platforms, build a
   **development build** instead:
   ```bash
   npx expo install expo-dev-client
   npx eas build --profile development --platform android
   # or: npx expo run:android / npx expo run:ios (local build, needs Xcode/Android Studio)
   ```
   Install that build on your phone(s) in place of Expo Go, then run
   `npx expo start --dev-client`.

## Run

```bash
npm install
npx expo start --dev-client   # or plain `npx expo start` if only testing in Expo Go on iOS
```

## What it does

- On first launch, asks for notification permission, gets an Expo push token,
  and registers it with the backend under the name you type.
- Listens for incoming notifications (foreground and tapped-from-background)
  and opens `src/EmergencyAlertModal.js` — a full-screen red/orange banner —
  regardless of app state.
- Tapping "I understand" calls `POST /alerts/:id/ack` on the backend and
  dismisses the modal.
