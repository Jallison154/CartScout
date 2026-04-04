# TestFlight readiness checklist (CartScout iOS)

Use this before uploading builds to App Store Connect. Nothing here submits the app for you.

## App config (Expo)

- [ ] **`ios.bundleIdentifier`** — Set in `app.json` (default `com.cartscout.app`). Must be unique to your Apple Developer account; change if already taken.
- [ ] **`version`** (`CFBundleShortVersionString`) — User-facing release, e.g. `1.0.0` in `app.json`.
- [ ] **`ios.buildNumber`** — Starting value in `app.json`; EAS **production** profile uses `autoIncrement` so each new store upload gets a higher build without manual bumps.
- [ ] **App display name** — `expo.name` (`CartScout`) is the default; override on Apple’s side if you use a different marketing name.
- [ ] **Encryption** — `ios.config.usesNonExemptEncryption: false` (standard HTTPS-only apps). Confirm in App Store Connect export compliance if asked.

## Icons and splash

- [ ] **`assets/icon.png`** — Replace default Expo placeholder with a 1024×1024 (no transparency) production icon before public TestFlight.
- [ ] **`assets/splash-icon.png`** / **splash** — Replace or tune for brand; current setup is light background + contain (acceptable for early TestFlight).
- [ ] **App Store marketing icon** — Upload 1024×1024 in App Store Connect (separate from the in-app icon if Apple asks).

## Permissions (barcode + receipt)

- [ ] **Camera** — `NSCameraUsageDescription` is set in `app.json` `ios.infoPlist` and aligned with `expo-camera` / `expo-image-picker` plugin strings (barcode scan + receipt photo).
- [ ] **Photo library** — `NSPhotoLibraryUsageDescription` set for “choose receipt from library.”
- [ ] **Microphone** — Not requested (`recordAudioAndroid: false`); no barcode audio recording.

## API base URL (dev vs production)

- [ ] **Development** — `.env` or shell: `EXPO_PUBLIC_API_URL` → LAN or localhost (see `.env.example`).
- [ ] **TestFlight / production builds** — Set `EXPO_PUBLIC_API_URL` for **production** EAS builds (EAS **Secrets** or project **Environment variables** in expo.dev). Value is baked in at build time; wrong URL = app cannot reach API.
- [ ] **HTTPS** — Use `https://` for any wide TestFlight or App Store audience unless you fully control risk.

## EAS Build

- [ ] Install EAS CLI: `npm i -g eas-cli`
- [ ] `eas login` and `eas build:configure` if you have not already (generates/updates `eas.json`).
- [ ] Apple Developer Program membership, bundle ID registered (or let EAS create it), signing credentials.
- [ ] Build: `eas build --platform ios --profile production` (or `preview` for internal-only testers first).

## App Store Connect (metadata — not in repo)

- [ ] **Privacy Policy URL** — **Placeholder:** `https://yourdomain.com/privacy` — publish a real policy before App Store review; required for most apps.
- [ ] **Support URL** — **Placeholder:** `https://yourdomain.com/support` or a mailto/support page.
- [ ] **Marketing URL** — Optional.
- [ ] **Support email** — **Placeholder:** `support@yourdomain.com` — use a monitored inbox in App Store Connect / metadata.
- [ ] **App Privacy questionnaire** — Declare data collected (e.g. account email, API traffic, photos only processed for receipts if applicable). Align with your backend and analytics (none declared in-app here).
- [ ] **Age rating** — Complete questionnaire honestly.
- [ ] **Screenshots** — Required sizes for iPhone (and iPad if tablet supported).
- [ ] **Description / keywords / subtitle** — Review copy.
- [ ] **Test information** — Demo account if sign-in is required for reviewers.

## Optional polish

- [ ] **Associated domains / universal links** — Only if you add deep links beyond the `cartscout` scheme.
- [ ] **Push notifications** — Not configured in this project; add only if you implement them.

## Quick verify after install

- [ ] App launches, sign-in/register against production API.
- [ ] Barcode scan flow requests camera and works on device.
- [ ] Receipt import: camera + photo library prompts appear and match behavior.

---

**Note:** Change `com.cartscout.app` everywhere (iOS + Android in `app.json`) if you use a different bundle / application id.
