# CartScout

Grocery list app built for **iPhone and Android** (Expo/React Native) with an API-first Node.js backend. Plan your next trip, manage lists, meal planning, and store totals.

## Structure

- **server/** – Node.js + Express API at `/api/v1`. Token-based auth (access + refresh), lists, list items, push token registration. SQLite by default.
- **apps/mobile/** – Expo (React Native) app for iOS and Android. Auth (SecureStore), lists, push notifications, deep linking (`cartscout://`), offline cache helpers.
- **packages/types** – Shared TypeScript types for API contract.
- **packages/api-client** – Shared API client (Bearer token, refresh on 401).

## Setup

1. **Install dependencies** (from repo root):
   ```bash
   npm install
   ```

2. **Environment** (optional for local dev): Copy `.env.example` to `.env` and set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` if you want. The server will run with defaults otherwise.

3. **Run the API** (Terminal 1):
   ```bash
   npm run server
   ```
   You should see: `CartScout API listening on http://localhost:4000 (api: /api/v1)`.
   - Health check: http://localhost:4000/health (or run `npm run test:api` from another terminal).

4. **Run the mobile app** (Terminal 2):
   ```bash
   npm run mobile
   ```
   Then press **`i`** for iOS simulator or **`a`** for Android emulator. To use the **web** build in the browser, press **`w`**.
   - The app talks to `http://localhost:4000` by default. If the API is on another host (e.g. your machine’s IP for a physical device), set `EXPO_PUBLIC_API_URL` in `.env` or in `apps/mobile/.env`.

## Spool up and test (quick)

From the project root:

1. **Terminal 1 – start the API**
   ```bash
   npm run server
   ```
   Leave this running.

2. **Terminal 2 – start the app**
   ```bash
   npm run mobile
   ```
   Press `w` to open in the browser, or `i` / `a` for simulator/emulator.

3. **Test the API** (optional, from a third terminal):
   ```bash
   npm run test:api
   ```
   Should print something like `{"status":"ok","version":"0.1.0"}`.

4. **In the app**: Open “Create account”, sign up with any email/password (min 8 chars), then you’ll land on Lists. Create a list and add items (via “+ New list”; full item search comes when retailer APIs are wired in).

## API (mobile-ready)

- **Auth**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`. Responses include `accessToken`, `refreshToken`, `expiresIn` in JSON for mobile SecureStore.
- **Lists**: `GET/POST /api/v1/lists`, `GET/PATCH/DELETE /api/v1/lists/:id`. Use `?include=items` to embed items.
- **List items**: `POST /api/v1/lists/:id/items`, `PATCH/DELETE /api/v1/lists/:id/items/:itemId`.
- **Push**: `POST /api/v1/push/register` (body: `token`, `platform`) to register device for notifications.

All responses: `{ data }` or `{ error: { code, message } }`.

## Mobile features

- **Auth**: Sign up / sign in; tokens stored in Expo SecureStore; refresh on 401.
- **Push**: Use `registerForPushNotifications(api)` from `lib/push` (e.g. after login).
- **Deep linking**: `cartscout://list/:id` (configured in app.json).
- **Offline**: Helpers in `lib/offline` for caching lists and queuing mutations; sync when back online (see TODOs for full sync).

## App store

See [docs/APP_STORE_ASSETS.md](docs/APP_STORE_ASSETS.md) for icons, screenshots, privacy policy URL, and build steps.

## License

Private / unlicensed unless stated otherwise.
