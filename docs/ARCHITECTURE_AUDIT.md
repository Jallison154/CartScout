# CartScout — Architecture Audit & Refactor Plan

**Scope:** Full repository audit. No code changes; analysis and design only. Implementation will follow in vertical slices after approval.

---

## 1. Current State Summary

### Repo layout
- **Monorepo** (npm workspaces): `server`, `apps/mobile`, `packages/api-client`, `packages/types`.
- **Server:** Express on `/api/v1`, SQLite via `better-sqlite3`, JWT access/refresh, no ORM.
- **Mobile:** Expo (React Native) with file-based routing; auth via context; optional mock API for dev without server.
- **Shared:** `@cartscout/types` for API contracts; `@cartscout/api-client` for HTTP + auth helpers.

### What works
- Auth: register, login, refresh, Bearer on protected routes, token storage (SecureStore/localStorage).
- Lists CRUD and list items (add product/free text, check/uncheck, delete).
- Product search for suggestions; stores and user favorites; per-list store selection.
- Push token registration; deep links to list; offline cache (lists only) and offline banner.
- Mock API for UI development; consistent `{ data }` / `{ error: { code, message } }` response shape.

### Current structure (high level)
```
server/src/
  index.ts, config.ts
  auth/jwt.ts
  db/client.ts, schema.sql
  middleware/auth.ts, response.ts
  routes/auth.ts, lists.ts, products.ts, stores.ts, push.ts, index.ts
  types/index.ts

apps/mobile/
  app/ (expo-router: index, login, register, (tabs)/*, list/[id])
  lib/ auth.tsx, mockApi.ts, storage.ts, offline.ts, push.ts

packages/
  api-client/src/index.ts
  types/src/index.ts
```

---

## 2. Major Issues (Ranked by Severity)

### Critical
1. **Business logic in route handlers** — All DB access, validation, and domain rules live in route files. No service layer; routes are 200–300 lines with repeated “get list, check ownership, run query” patterns. Hard to test and reuse.
2. **Auth refresh duplicated and racy** — Refresh is implemented in both `packages/api-client` (`refresh()` + 401 retry) and `apps/mobile/lib/auth.tsx` (raw `fetch` in `onUnauthorized`). Mobile does not use `api.refresh()`; it reimplements refresh and updates storage. No guarantee storage is written before ApiClient retry reads the new token.
3. **No shared request/response DTOs** — Server uses ad-hoc `req.body as { ... }` and inline types. `@cartscout/types` is used on the client only. Contract can drift (e.g. auth/me returns `createdAt`; if server sent `created_at` it would be a silent mismatch).

### High
4. **Inconsistent validation** — Some routes validate (auth, stores, list items), others do minimal checks (e.g. list PATCH accepts any string for `name` with only trim). No shared validation layer or schema (e.g. Zod/Joi). List type and week_start validation repeated in multiple handlers.
5. **Duplicated “list ownership” and “list exists” logic** — Every list route re-runs the same “SELECT list WHERE id AND user_id” and sends NOT_FOUND. Same for list item existence. Should be one place (e.g. service or middleware).
6. **Duplicated DEFAULT_STORES / MOCK_STORES** — Same store list defined in `settings.tsx`, `list/[id].tsx`, and `mockApi.ts`. Changes require edits in three places; risk of divergence.
7. **Offline queue unused** — `offline.ts` exposes `enqueueMutation`, `getOfflineQueue`, `clearOfflineQueue`, but no screen or sync logic uses them. BUILD_LIST marks “queue + sync” as optional; code suggests it was started but not wired.
8. **api-client does not use its own refresh on 401** — Client has `refresh()` and `onUnauthorized` but the app’s `onUnauthorized` does a manual fetch. Either use `api.refresh()` from `onUnauthorized` or remove refresh from ApiClient and own it fully in the app.

### Medium
9. **No API route standards** — No document or convention for status codes, error codes, query/body shapes, or versioning. Each route is ad hoc (e.g. PUT list stores returns array; DELETE returns 204 with no body).
10. **Pricing table unused** — `store_product_prices` exists in schema and is referenced in comments (push “price updates”) but no routes or jobs read/write it. No caching strategy or TTL defined.
11. **Frontend state is local and repeated** — Lists, list detail, stores, favorites each use `useState` + `useEffect` + manual refetch. No shared cache (e.g. React Query/SWR), so multiple screens can show stale data and refetch independently.
12. **Error handling inconsistent** — Backend: asyncHandler catches and uses `err.code`/`err.statusCode` but no route throws such errors; only `sendError` is used. Frontend: mostly `Alert.alert("Error", e.message)`; settings has special-case message for “404”/“Not found” suggesting server update. No global error boundary or API error mapping.
13. **Naming inconsistencies** — DB and server types use snake_case (`created_at`, `list_type`); `@cartscout/types` mixes snake_case (List, ListItem) and camelCase (User.createdAt). API responses mix (auth/me returns camelCase for user; lists return snake_case).

### Low
14. **Placeholder tabs in nav** — Meal plan and Store totals are full tab entries with “Coming soon” only. They increase navigation surface and user expectation without functionality.
15. **Hardcoded copy and scripts reference** — Settings 404 message references `scripts/ubuntu-install.sh pull`; too deployment-specific for a generic error.
16. **MockApiClient and ApiClient divergence** — Mock implements the same methods but with different defaults (e.g. limit). Small drift can cause different behavior in mock vs real.

---

## 3. Recommended Architecture

### Principles
- **API-first:** Backend exposes a stable REST API; mobile and future clients consume it. No backend logic in “mobile-only” code.
- **Thin controllers:** Routes parse input, call services, return DTOs. No DB or business logic in route files.
- **Single source of truth for contracts:** Shared types/DTOs (in `packages/types` or a dedicated `packages/api-contract`) used by server and client; validate at boundaries.
- **Explicit layers:** Routes → Services → Repositories (optional) / DB. Auth and response formatting are middleware.

### High-level layers
1. **Routes** — HTTP only: body/query/params parsing, auth middleware, call service, send response.
2. **Services** — Application logic: validation (or delegate to validators), orchestration, use repositories or DB.
3. **Repositories (optional)** — Encapsulate SQL and row mapping; services call repos. Introduce when route files are thinned so that “list by id for user” is one call.
4. **Shared types/contracts** — Request/response and error shapes; optionally runtime validation (Zod) from the same definitions.

### Auth handling
- **Server:** Keep JWT access + refresh; add optional rate limiting and refresh rotation policy (e.g. single-use refresh, expiry). Validate tokens in middleware; attach `userId` (and optionally `sessionId`) to request.
- **Client:** Single refresh path: on 401, call `api.refresh(refreshToken)` (using stored refresh token). ApiClient’s `onUnauthorized` should only trigger that call and persist new tokens; then retry. No duplicate refresh logic in auth context.

### Caching (pricing)
- **Backend:** Treat `store_product_prices` as cache. Define TTL (e.g. 24h or 1h). No API yet that returns prices; when added, read from this table; a separate job or on-demand flow populates it from retailer APIs. Add `fetched_at`-based invalidation in queries.
- **Frontend:** When store totals feature is built, cache price responses per list/store with short TTL or use React Query with stale-while-revalidate.

---

## 4. Proposed Folder Structure

### Server
```
server/src/
  index.ts                 # app setup, mount routes, global error handler
  config.ts
  api/
    v1/
      index.ts             # mount all v1 routes under /api/v1
      auth.routes.ts
      lists.routes.ts
      list-items.routes.ts # optional: split from lists
      stores.routes.ts
      products.routes.ts
      push.routes.ts
  services/
    auth.service.ts
    lists.service.ts
    list-items.service.ts
    stores.service.ts
    products.service.ts
    push.service.ts
  db/
    client.ts
    schema.sql
    repositories/          # optional phase 2
      list.repository.ts
      user.repository.ts
      ...
  middleware/
    auth.middleware.ts
    response.middleware.ts
    validate.middleware.ts # optional: body/query validation
  auth/
    jwt.ts
  types/
    index.ts
    errors.ts              # AppError, error codes
  validators/              # optional: Zod schemas
    auth.validator.ts
    list.validator.ts
```

### Mobile (apps/mobile)
```
app/                      # keep existing expo-router structure
  _layout.tsx
  index.tsx
  login.tsx, register.tsx
  (tabs)/_layout.tsx, index.tsx, lists.tsx, settings.tsx, meal-plan.tsx, store-totals.tsx
  list/[id].tsx
lib/
  auth.tsx                # AuthProvider, useAuth; single refresh path via api.refresh
  storage.ts
  push.ts
  offline.ts
api/
  client.ts               # re-export or wrap @cartscout/api-client with app-specific config
  mock.ts                 # MockApiClient + useMockApi
constants/
  stores.ts               # DEFAULT_STORES single definition
hooks/                    # optional: shared data hooks
  useLists.ts
  useList.ts
  useStores.ts
```

### Packages
```
packages/
  types/
    src/
      index.ts            # shared DTOs, ApiResponse, ApiError, request/response types
      api/                # optional: per-resource request/response
        auth.types.ts
        lists.types.ts
  api-client/
    src/
      index.ts            # ApiClient; use packages/types for all DTOs
```

---

## 5. Database Schema Improvements

- **Keep current tables** for users, refresh_tokens, lists, list_items, canonical_products, stores, list_stores, user_favorite_stores, push_tokens, store_product_prices.
- **Naming:** Prefer consistent snake_case and one convention for timestamps (already using `created_at`/`updated_at`).
- **store_product_prices:** Add a comment or migration note for intended TTL (e.g. consider row expired when `fetched_at` older than 24h). When implementing pricing API, add index (e.g. `(store_id, canonical_product_id, fetched_at)`) if querying by freshness.
- **Indexes:** Already have sensible indexes on FKs and common filters. Consider index on `list_items(list_id, sort_order)` if not present for “items for list ordered”.
- **Migrations:** Introduce migration files (e.g. numbered SQL or a small runner) instead of single schema.sql so future changes are additive and traceable.
- **No schema change required for refactor** — current schema is sufficient for the proposed service/repo split.

---

## 6. Backend Refactor Plan

1. **Introduce types/errors** — Define `AppError` (code, message, statusCode) and standard error codes in `server/src/types/errors.ts`. Have services throw AppError; middleware or asyncHandler maps to `sendError`.
2. **Extract services** — For each route file (auth, lists, stores, products, push), create a corresponding service (e.g. `lists.service.ts`). Move all DB and business logic from routes into services. Routes: parse input, call service, send response.
3. **Centralize “list for user” and “item for list”** — One function in list service (or list repository) that returns a list by id iff it belongs to user; use it in every list and list-item handler. Same for “get item by id and list id”.
4. **Optional validators** — Add Zod (or similar) schemas for register, login, create list, add item, etc. Validate in middleware or at top of service; use shared types from packages/types where possible.
5. **API route standards (document + apply)** — Document: status codes (200, 201, 204, 400, 401, 404, 409, 500), error body shape, list endpoints (include=items), pagination (future). Refactor existing routes to match.
6. **Split large route files** — e.g. list items could be `lists.routes.ts` (list CRUD + list stores) and `list-items.routes.ts` (item CRUD) for clarity.
7. **No new features** — This refactor does not add pricing API, meal planning, or offline sync; it only reorganizes and standardizes.

---

## 7. Frontend Refactor Plan

1. **Single auth refresh path** — In `auth.tsx`, pass an `onUnauthorized` that calls `api.refresh(refreshToken)` (from storage), then persists via existing `setTokens`. Remove raw fetch to `/api/v1/auth/refresh`. Ensure ApiClient awaits token persistence before retrying (or have refresh() update storage and then getToken() read it).
2. **Single DEFAULT_STORES** — Create `constants/stores.ts` (or under `lib/`) with one `DEFAULT_STORES` array. Import in settings, list detail, and mock (mock can import or duplicate for true offline fixture; prefer import).
3. **Error handling** — Map API error codes to user-facing messages in one place (e.g. `lib/errors.ts` or inside api client). Replace ad hoc “Not found”/“Server update needed” strings with this mapping. Optionally add a global API error handler or error boundary for “Something went wrong”.
4. **Optional data layer** — Introduce React Query (or SWR) for lists, list detail, stores, favorites. Use for loading/error/cache and invalidation; keep existing UI until you’re ready to adopt hooks screen-by-screen.
5. **Meal plan / Store totals** — Either remove tabs until features exist or keep as placeholders but document as “Coming soon” and avoid implying backend support. No backend changes for these in this refactor.

---

## 8. Step-by-Step Refactor Roadmap (Small Tickets)

Implement in order; each ticket should be shippable and tests (or manual checks) passing.

### Phase A — Foundation (no behavior change)
1. **A1** — Add `server/src/types/errors.ts`: AppError class and standard codes. Use in one route (e.g. auth) and asyncHandler to map thrown AppError to sendError.
2. **A2** — Document API route standards in `docs/API_STANDARDS.md` (status codes, error shape, auth, list/include=items).
3. **A3** — Create `server/src/services/lists.service.ts`: move “get list by id for user” and “list ownership check” into functions; have lists routes call them. No new endpoints.
4. **A4** — Extract remaining list and list-item logic from `lists.ts` into `lists.service.ts` (and optionally `list-items.service.ts`). Routes become thin: parse, call service, send.

### Phase B — Auth and contracts
5. **B1** — Fix refresh: in mobile `auth.tsx`, implement `onUnauthorized` by calling `api.refresh(refreshToken)` and ensure tokens are persisted before ApiClient retries. Remove duplicate fetch. Verify 401 → refresh → retry flow.
6. **B2** — Align auth response types: ensure server auth routes return exactly the shape in `@cartscout/types` (or add types to packages/types and have server use them). Document in API_STANDARDS.
7. **B3** — Add `server/src/services/auth.service.ts`; move register/login/refresh/me logic from auth routes into service. Routes only parse and send.

### Phase C — Services and validation
8. **C1** — Extract `stores.service.ts` and `products.service.ts`; thin store and product routes.
9. **C2** — Extract `push.service.ts`; thin push route.
10. **C3** — Introduce validators (e.g. Zod) for auth and list bodies; validate in middleware or at service entry. One ticket per resource (auth, lists, list-items) or one ticket for “validators + wire for auth and lists”.

### Phase D — Frontend and cleanup
11. **D1** — Add `constants/stores.ts` (or `lib/constants/stores.ts`) with single DEFAULT_STORES; use in settings, list detail, and mock.
12. **D2** — Centralize API error mapping (code → message); use in auth, lists, settings, list detail. Remove hardcoded “Server update needed” / script reference.
13. **D3** — Optional: Add React Query (or SWR) for lists and list detail; refactor Lists screen and list/[id] to use it. Keep mock API compatible.
14. **D4** — Optional: Offline queue — either wire `enqueueMutation`/getOfflineQueue/clearOfflineQueue into a sync flow (one small ticket) or document as “Phase 2” and leave as-is.

### Phase E — Structure and polish
15. **E1** — Reorganize server into `api/v1/`, `services/`, optional `repositories/` and `validators/` as in proposed folder structure. Update imports.
16. **E2** — Ensure all server code uses shared error types and service layer; remove any remaining DB access from route files.
17. **E3** — Final pass: naming (snake_case vs camelCase) in API responses documented and consistent; types in packages/types match server responses.

---

## 9. Definition of Done (Checklist for Future Features)

Use this for every new feature (backend or frontend) so the codebase stays consistent.

### Backend
- [ ] New behavior lives in a **service** (or repository); route only parses input, calls service, returns DTO.
- [ ] Request/response shapes are **documented** and, where possible, expressed in **shared types** (packages/types or server types that mirror contract).
- [ ] **Validation** for new body/query params (shared validator or inline in service); return 400 with VALIDATION_ERROR and clear message.
- [ ] **Errors** use standard codes and `sendError` (or throw AppError); no ad hoc status codes.
- [ ] **Auth:** Protected routes use `requireAuth`; use `req.userId` from middleware only.
- [ ] **DB:** Prefer parameterized queries; no raw string interpolation. New tables or columns have a **migration** (or note in schema) and indexes for common filters.

### Frontend
- [ ] New API calls go through **ApiClient** (or shared hook if using React Query). No raw fetch for API v1 (except in api-client or auth refresh if centralized there).
- [ ] **Errors** from API are handled via shared mapping or handler; user sees a consistent message.
- [ ] New screens that need lists/stores/user data use **shared constants or hooks** (e.g. DEFAULT_STORES from one place; useLists/useList if adopted).
- [ ] **Mock API:** If the feature is part of core flows, MockApiClient implements the same methods so `npm run test:app` still works.

### General
- [ ] **Naming:** Follow project convention (e.g. API and DB snake_case; TypeScript types match contract).
- [ ] **Docs:** New endpoints or behaviors are reflected in API_STANDARDS or README if user-facing.
- [ ] **No business logic in controllers:** Controllers (route handlers / screen components) orchestrate and display; they do not contain domain rules or multi-step business flows.

---

## 10. Caching Strategy for Pricing (Summary)

- **Backend:** `store_product_prices` is the cache. When a “store totals” or “price for product at store” feature is added:
  - Read from this table; treat rows as valid only if `fetched_at` is within TTL (e.g. 24h). Document TTL in schema or config.
  - Populate/refresh via a background job or on-demand endpoint that calls retailer APIs and upserts into `store_product_prices` with current `fetched_at`.
- **Frontend:** When consuming price API:
  - Cache responses per (list, store) or per product with short TTL (e.g. 5–15 minutes) or use React Query with `staleTime` to avoid refetching every navigation.
- **No implementation in this refactor** — only the above strategy so that when the feature is built, caching is consistent.

---

*End of audit. Approve this plan to proceed with implementation in vertical slices (e.g. A1 → A2 → …).*
