# App Store and Play Store Assets

Use this checklist when submitting CartScout to the App Store (iOS) and Google Play (Android).

## Required assets

- **App icon**: 1024×1024 px (iOS), 512×512 px (Android). Place as `apps/mobile/assets/icon.png` and `adaptive-icon.png`.
- **Splash screen**: `apps/mobile/assets/splash-icon.png` (recommended 1284×2778 or similar).
- **Favicon** (web): `apps/mobile/assets/favicon.png` (48×48 or 32×32).

## Store listing

- **Privacy policy URL**: Required by both stores. Host your policy (e.g. from the multi-user plan) and set the URL in the store listing and in `app.json` if supported.
- **Short description** (Android: 80 chars; iOS: subtitle).
- **Full description**: Explain CartScout (grocery lists, meal planning, store totals, push to next order, optional Kroger cart).
- **Screenshots**: At least one per device type (phone, tablet if supported). Show lists, list detail, and sign-in or home.

## App identifiers

- **iOS**: `com.cartscout.app` (bundleIdentifier in app.json).
- **Android**: `com.cartscout.app` (package in app.json).

## Deep linking

- **Scheme**: `cartscout://` (e.g. `cartscout://list/123` to open a list). Configured in app.json (`scheme`) and Android `intentFilters`.

## Build commands

- **Development**: `npm run mobile` (from repo root) or `npx expo start` in `apps/mobile`.
- **Production build**: Use EAS Build or `expo build` (see Expo docs) to produce iOS and Android binaries.
