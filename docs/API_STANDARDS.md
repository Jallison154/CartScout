# CartScout API standards

Base path: **`/api/v1`**. All responses are JSON.

---

## Naming conventions

- **Lists, list items, stores, products:** JSON field names use **snake_case** (e.g. `created_at`, `list_type`, `canonical_product_id`, `display_name`). This matches the database and `@cartscout/types` (`List`, `ListItem`, `Store`, `CanonicalProduct`).
- **Auth user:** The user object in `GET /api/v1/auth/me` and in login/register/refresh responses uses **camelCase** for the single timestamp: `createdAt`. All other auth fields are lowercase (`id`, `email`). Contract type: `User` in `@cartscout/types`.
- New endpoints should follow these conventions so client types stay in sync with server responses.

---

## Success responses

- **200 OK** — GET/PATCH/PUT success. Body: `{ "data": <payload>, "meta": { ... }? }`.
- **201 Created** — POST success (create resource). Body: `{ "data": <created resource> }`.
- **204 No Content** — DELETE success. No body.

`meta` is optional and may include `pagination: { total, limit, offset }` for list endpoints (future).

---

## Error responses

Body shape: `{ "error": { "code": "<code>", "message": "<human-readable message>" } }`.

### Standard codes and status codes

| Code              | HTTP status | When to use |
|-------------------|------------|-------------|
| `VALIDATION_ERROR`| 400        | Invalid or missing body/query (e.g. required field missing, format invalid). |
| `UNAUTHORIZED`    | 401        | Missing or invalid auth (no/invalid Bearer token, wrong credentials, refresh expired). |
| `FORBIDDEN`       | 403        | Authenticated but not allowed to perform this action (reserved for future use). |
| `NOT_FOUND`       | 404        | Resource does not exist or user has no access (e.g. list not found, item not found). |
| `CONFLICT`        | 409        | Request conflicts with current state (e.g. email already registered). |
| `INTERNAL_ERROR`  | 500        | Unexpected server error. |

Clients should use `error.code` for logic and `error.message` for display.

---

## Authentication

- **Protected routes:** Require header `Authorization: Bearer <accessToken>`.
- **Token issuance:** `POST /api/v1/auth/login` and `POST /api/v1/auth/register` return `{ "data": { "user", "accessToken", "refreshToken", "expiresIn" } }`. `user` is `{ "id", "email" }`. Contract types: `AuthLoginResponse` in `@cartscout/types`.
- **Refresh:** When access token expires, client sends `POST /api/v1/auth/refresh` with body `{ "refreshToken": "<refreshToken>" }` (no Bearer). Response is `{ "data": { "user", "accessToken", "refreshToken", "expiresIn" } }` (`AuthRefreshResponse`). Client replaces stored tokens.
- **Current user:** `GET /api/v1/auth/me` returns `{ "data": { "id", "email", "createdAt" } }` (requires Bearer). Contract type: `User` in `@cartscout/types`.

---

## Lists

- **GET /api/v1/lists** — List summaries for the current user. Query: `include=items` (optional) to embed items in each list.
- **GET /api/v1/lists/:id** — Single list. Query: `include=items` (optional).
- **POST /api/v1/lists** — Create list. Body: `{ "name"?, "list_type"?, "week_start"? }`. `list_type`: `current_week` | `next_order` | `custom`.
- **PATCH /api/v1/lists/:id** — Update list. Body: `{ "name"?, "list_type"?, "week_start"? }`.
- **DELETE /api/v1/lists/:id** — Delete list. Returns 204.
- **GET /api/v1/lists/:id/stores** — Store IDs for this list. Returns `{ "data": ["store-id", ...] }`.
- **PUT /api/v1/lists/:id/stores** — Set stores for this list. Body: `{ "store_ids": ["store-id", ...] }`. Returns `{ "data": ["store-id", ...] }`.

---

## List items

- **POST /api/v1/lists/:id/items** — Add item. Body: `{ "canonical_product_id"?, "free_text"?, "quantity"? }`. At least one of `canonical_product_id` or `free_text` required.
- **PATCH /api/v1/lists/:id/items/:itemId** — Update item. Body: `{ "quantity"?, "checked"? }`.
- **DELETE /api/v1/lists/:id/items/:itemId** — Remove item. Returns 204.

---

## Stores and products

- **GET /api/v1/stores** — All stores (for pickers). Returns `{ "data": [ { "id", "external_id", "name", ... }, ... ] }`.
- **GET /api/v1/stores/favorites** — Current user’s favorite store IDs. Returns `{ "data": ["store-id", ...] }`.
- **POST /api/v1/stores/favorites** — Add favorite. Body: `{ "store_id": "<id>" }`. Returns updated list of IDs.
- **DELETE /api/v1/stores/favorites/:storeId** — Remove favorite. Returns updated list of IDs.
- **GET /api/v1/products/search?q=&limit=** — Search canonical products (for suggestions). Returns `{ "data": [ ... ] }`.

---

## Versioning

API prefix is `/api/v1`. Breaking changes will be introduced under a new version path (e.g. `/api/v2`). Non-breaking additions (new optional fields, new endpoints) may be made within v1.

---

## Production

- **HTTPS only:** Serve the API over TLS in production. Do not send access or refresh tokens over plain HTTP.
- **Secrets:** Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random strings (min 32 characters). The server refuses to start when `NODE_ENV=production` if these are missing or still the default dev values.
- **Environment:** Copy `.env.example` to `.env` and set all required variables before deploying.
