# Developing the app without the API server

You can build and test the **entire UI and flow** without running the backend by using the **mock API**.

## Easiest way to test the app (no server)

From the project root:

```bash
npm run test:app
```

This starts the Expo app with the mock API enabled. Then:

1. Open the app in the simulator, on a device, or press **w** for web.
2. Sign in with any email and password (e.g. `test@test.com` / `password`).
3. Use **Lists** (create, open, add items, check/uncheck, delete), **Settings** (store toggles), and the **product suggestion** popup when adding items.

No API server or database required. You’ll see a “Using mock API (no server)” banner on the Home tab when mock mode is on.

## How it works

- The app uses the same API interface everywhere (`api.lists()`, `api.addListItem()`, etc.).
- When **EXPO_PUBLIC_USE_MOCK_API** is set to `true`, the app swaps in a **MockApiClient** that:
  - Accepts any email/password for login/register and returns a fake token (you stay “logged in” for the session).
  - Keeps lists and list items **in memory** so create/add/update/delete all work.
  - Uses static fixtures for stores and product search (same data as server seeds).
  - Saves favorite stores in memory (toggling works until you refresh).

No server, no database, no network. Good for:

- UI and navigation iteration
- Demos and screenshots
- Working offline or before the server is deployed
- Reducing coupling (frontend and backend can evolve in parallel)

## Enable mock API

**Option A – environment variable (recommended)**

In the project root or in `apps/mobile`, create or edit `.env`:

```bash
EXPO_PUBLIC_USE_MOCK_API=true
```

Then start the app (e.g. `npx expo start`). Restart the app after changing this.

**Option B – app config**

In `apps/mobile/app.config.js` (or `app.json`), you can set:

```json
{
  "expo": {
    "extra": {
      "useMockApi": true
    }
  }
}
```

and read it via `expo-constants`; the current implementation uses **EXPO_PUBLIC_USE_MOCK_API** only.

## What you’ll see

- **Home tab:** A yellow banner: “Using mock API (no server)” so you know mock mode is on.
- **Login/Register:** Any email and password work; you’re taken to the main app.
- **Lists:** Create lists, open them, add items (typed or from suggestions), check/uncheck, long-press delete. All state is in memory for the session.
- **Settings:** Store list and favorite toggles work; favorites are in memory.
- **Product suggestions:** Typing in “Add item” shows fixture products (milk, bread, eggs, etc.).

## Switching back to the real API

- Remove or set `EXPO_PUBLIC_USE_MOCK_API=false` (or omit it).
- Restart the app.
- Point **EXPO_PUBLIC_API_URL** at your real server (e.g. `http://192.168.10.47:4000`).

Mock and real clients use the same method names and response shapes (from `@cartscout/types`), so the UI code stays the same.
