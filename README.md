# CartScout

iPhone-first grocery app (Expo) and API (Express), organized as a small monorepo.

## Layout

| Path | Role |
|------|------|
| `apps/mobile` | Expo Router app with tabs (Home, Lists, Settings), auth, and grocery lists UI |
| `server` | Node.js HTTP API (Express, TypeScript) |
| `packages/types` | Shared TypeScript types |
| `packages/api-client` | Typed HTTP helpers for the API |
| `scripts` | Repo automation (Ubuntu API installer) |
| `docs` | Design and API notes |

## Prerequisites

- Node.js 22.5+ and npm (the API uses `node:sqlite`)

## Install

From the repo root:

```bash
npm install
```

## Run

**Mobile** (Expo dev server — use the iOS simulator or Expo Go on your iPhone):

```bash
npm run mobile
```

Or from `apps/mobile` only (after a root `npm install` so workspaces link):

```bash
cd apps/mobile && npm run start
```

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` (use your machine’s LAN IP when testing on a device, e.g. `http://192.168.1.10:4000`). The app stores access and refresh tokens with **Expo SecureStore**, restores the session on launch via `/api/v1/auth/me` and `/api/v1/auth/refresh`, and routes signed-in users to the main shell (`/home`).

**API** (local Express server):

```bash
npm run server
```

Default port: `4000` (override with `PORT`). Listens on `0.0.0.0` by default so devices on your LAN can reach it (override with `HOST`). `GET /health` returns `{ "status": "ok" }`.

On startup the server opens SQLite via **`node:sqlite`** (see `server/.env.example`), applies `server/src/db/schema.sql`, and keeps a single `DatabaseSync` for the process. Use **`getDb()`** and **`withTransaction()`** from `server/src/db/index.ts` plus row types in **`schema.types.ts`** for queries. Default DB file: `server/data/cartscout.sqlite` (gitignored). Node may log that SQLite is experimental depending on your Node version.

Mobile and server do not depend on each other at runtime; start either one alone.

## Ubuntu / Proxmox — API on the LAN (no Docker)

For a simple VM on your network (e.g. Proxmox + Ubuntu) so an iPhone can hit the API over Wi‑Fi:

1. **Requirements:** This API needs **Node.js 22+** (built-in `node:sqlite`). **Node.js 20 does not work** with the current codebase.
2. **Install path:** Default is **`/opt/cartscout`** (full monorepo clone). Override with `INSTALL_ROOT` if needed.
3. **Run the installer** (as a user who owns `/opt/cartscout`, use `sudo` only when the script invokes apt/npm global):

   ```bash
   sudo mkdir -p /opt/cartscout
   sudo chown -R "$USER":"$USER" /opt/cartscout
   ```

   **If the directory is empty**, set `GIT_REPO` and install (clones for you):

   ```bash
   export GIT_REPO=https://github.com/<you>/CartScout.git
   ./scripts/ubuntu-install.sh install
   ```

   **If you already cloned** into `/opt/cartscout`:

   ```bash
   cd /opt/cartscout && ./scripts/ubuntu-install.sh install
   ```

   The script installs **git**, **build-essential**, **curl**, **Node.js 22** (NodeSource), **pm2**, writes **`/opt/cartscout/cartscout.env`** from `server/deploy/cartscout.env.example` if missing, runs **`npm ci`** + **`npm run build`** for the server workspace, and starts or reloads **`cartscout-api`** via **`server/deploy/ecosystem.config.cjs`**, then **`pm2 save`**.

4. **Update after `git push`:**

   ```bash
   cd /opt/cartscout && ./scripts/ubuntu-install.sh update
   ```

5. **Reinstall dependencies** (clean `node_modules`, rebuild):

   ```bash
   cd /opt/cartscout && ./scripts/ubuntu-install.sh reinstall
   ```

6. **PM2:** `pm2 status`, `pm2 logs cartscout-api`, `pm2 restart cartscout-api`. One-time boot: `pm2 startup systemd` then `pm2 save` (as the same user that runs the API).

7. **Environment:** Edit **`/opt/cartscout/cartscout.env`**. Important keys: **`PORT`** (default `4000`), **`HOST=0.0.0.0`**, **`DATABASE_PATH`** (default absolute SQLite path under `/opt/cartscout/data`), **`JWT_ACCESS_SECRET`** (≥32 chars if `NODE_ENV=production`).

8. **Verify from another device:** On the VM, `hostname -I` or `ip a` for the LAN IP. From phone or laptop: `curl -sS http://<LAN-IP>:4000/health`. Allow the port in the host firewall if needed (`sudo ufw allow 4000/tcp`). Point **`EXPO_PUBLIC_API_URL`** at `http://<LAN-IP>:4000`.

`server/deploy/install.sh` is a thin wrapper that calls **`scripts/ubuntu-install.sh`**.

### Auth (JSON tokens, no cookies)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/v1/auth/register` | Body: `{ "email", "password" }` (password ≥ 10 chars). `201` |
| `POST` | `/api/v1/auth/login` | Same shape. `200` |
| `POST` | `/api/v1/auth/refresh` | Body: `{ "refreshToken" }`. Rotates refresh token. `200` |
| `GET` | `/api/v1/auth/me` | Header: `Authorization: Bearer <accessToken>`. `200` |

Successful auth responses look like:

`{ "data": { "user": { "id", "email" }, "tokens": { "accessToken", "refreshToken", "accessExpiresIn", "tokenType": "Bearer" } } }`.

Errors: `{ "error": { "message", "code"?, "details"? } }` (e.g. `VALIDATION_ERROR` with a `details` array).

Configure `JWT_ACCESS_SECRET` (minimum 32 characters in production) and related vars in `server/.env.example`. Password hashing uses **bcrypt** through the **bcryptjs** library (bcrypt-compatible, pure JS).

### Lists (Bearer required)

All routes need `Authorization: Bearer <accessToken>`. Each list is scoped to the authenticated user.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/lists` | `{ "data": { "lists": [...] } }` |
| `POST` | `/api/v1/lists` | Body: `{ "name", "list_type"?, "week_start"? }`. `201` |
| `GET` | `/api/v1/lists/:id` | `{ "data": { "list", "items" } }` — each item includes `product` (`null` or full canonical product) when `canonical_product_id` is set |
| `PATCH` | `/api/v1/lists/:id` | At least one of `name`, `list_type`, `week_start`. `200` |
| `DELETE` | `/api/v1/lists/:id` | `204` |
| `POST` | `/api/v1/lists/:id/items` | Body: `free_text` and/or `canonical_product_id`; optional `quantity`, `sort_order`. `201` |
| `PATCH` | `/api/v1/lists/:id/items/:itemId` | Partial update (`free_text`, `quantity`, `checked`, `sort_order`, `canonical_product_id`). `200` |
| `DELETE` | `/api/v1/lists/:id/items/:itemId` | `204` |

Unknown list or item IDs return `404` `NOT_FOUND`.

### Products (canonical catalog, Bearer required)

Starter rows are seeded on DB init (`canonical_products`). Search uses `LIKE` on `display_name` and `brand` (case-insensitive), max **10** results.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/products/search?q=` | `q` required (non-empty after trim). `{ "data": { "products": [...] } }` |
| `GET` | `/api/v1/products/:id` | `{ "data": { "product" } }` or `404` |

`POST`/`PATCH` list items with `canonical_product_id` must reference an existing product (`400` `UNKNOWN_PRODUCT` otherwise).
