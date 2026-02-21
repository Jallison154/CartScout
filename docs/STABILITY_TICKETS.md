# Stability tickets — Critical breakages

Tickets for the three Critical breakages from the Stability Report. Fix in order: C1 → C2 → C3.

**Checkpoint (Critical complete):** C1, C2, and C3 are implemented. To verify locally: build server and packages (`npm run build --workspace=server`, etc.), start server and hit `GET /health`, then test auth (register/login). For C3: sign in, invalidate refresh token (e.g. delete from `refresh_tokens`), trigger an authenticated request — app should clear session and show login; sign in again to confirm.

---

## C1: AuthProvider hangs on loading when token storage fails

**Root cause:** In `AuthProvider`, the initial token load uses `storage.getItemAsync(TOKEN_KEY).then(...)` with no `.catch()`. If storage rejects (e.g. SecureStore unavailable, permission denied, or storage implementation throws), the promise rejection is unhandled and `setIsLoading(false)` is never called. The app remains in a permanent loading state and the user cannot reach login or any authenticated flow.

**Files affected:**
- `apps/mobile/lib/auth.tsx`

**Fix strategy:**
- In the `useEffect` that loads the token, add a `.catch()` (or use async/await in a small async IIFE with try/catch).
- On rejection: call `setIsLoading(false)` and leave `token` as `null` (treat as not authenticated).
- Optionally log the error in development only (e.g. `__DEV__` and `console.warn`), so production behavior is unchanged and no PII is logged.

**Acceptance criteria:**
- If `storage.getItemAsync(TOKEN_KEY)` rejects, `isLoading` becomes `false` within a short time and the app does not hang.
- No unhandled promise rejection when token load fails.
- When token load fails, user sees the unauthenticated flow (e.g. landing/login) as if no token was stored.

**How to test manually:**
1. **Happy path:** Open app with valid or no token; confirm loading finishes and correct screen shows.
2. **Simulate failure (dev):** Temporarily replace `storage.getItemAsync` in the auth effect with a function that returns `Promise.reject(new Error("storage failed"))`. Reload app; confirm loading spinner disappears, no crash, and user can reach login. Restore implementation after test.

**Migration impact:** None. No schema or API changes.

---

## C2: Server crashes on startup if schema file is missing

**Root cause:** `initDb()` in the DB client uses `readFileSync(schemaPath, "utf-8")` without a try/catch. The path is chosen from `existsSync(inDist) ? inDist : inSrc`. If both paths are missing (e.g. misconfigured build, deleted file, or wrong cwd), `readFileSync` throws and the Node process exits before the server listens. There is no clear error message indicating the schema file was missing.

**Files affected:**
- `server/src/db/client.ts`
- Optionally `server/src/index.ts` if we want to surface a clear exit message.

**Fix strategy:**
- Before calling `readFileSync`, check that `schemaPath` exists (we already derive it; re-check or ensure the chosen path exists).
- If the chosen path does not exist, throw a descriptive `Error` (e.g. "Schema file not found at ...") so the process exits with a clear message, or catch the `readFileSync` error and rethrow with a message that includes the attempted paths.
- Do not start the server if schema cannot be loaded; failing fast at startup is correct.

**Acceptance criteria:**
- If `schema.sql` is missing at both `dist/db/schema.sql` and `server/src/db/schema.sql` (relative to runtime), the process exits with a clear, actionable error message (e.g. "Schema file not found: ...").
- When the schema file is present in the usual location, server startup is unchanged and DB initializes as today.

**How to test manually:**
1. **Happy path:** Start server with schema in place; confirm it starts and health check passes.
2. **Missing schema:** Temporarily rename or move `server/src/db/schema.sql` and run the server (e.g. from repo root). Process should exit with a clear message about the missing schema file. Restore the file and confirm normal startup.

**Migration impact:** None. No schema or API changes; behavior only when schema file is missing.

---

## C3: No automatic logout after refresh token failure (stale session)

**Root cause:** On a 401 response, the api-client calls `onUnauthorized()` (which runs refresh). If refresh fails (e.g. refresh token expired or revoked), the client throws the refresh error to the caller and does not clear tokens or signal logout. The AuthProvider does not clear tokens on refresh failure. The user remains “signed in” (token state still set) but every subsequent request 401s and refresh keeps failing, so the app is effectively broken until the user manually signs out.

**Files affected:**
- `apps/mobile/lib/auth.tsx` (auth context: clear tokens and update state when refresh fails)
- `packages/api-client/src/index.ts` (optional: signal refresh failure so caller can distinguish “need to logout” from other errors; keep ticket focused on mobile logout behavior)

**Fix strategy:**
- In the mobile app, ensure that when refresh fails (e.g. in `onUnauthorized`), we clear tokens and set auth state to unauthenticated so the UI shows login.
- **Option A (recommended):** In `auth.tsx`, the `onUnauthorized` callback can call the same logic as logout (clear tokens from storage and call `setToken(null)`). If `client.refresh(refreshToken)` throws, catch in `onUnauthorized`, clear tokens and set token state to null, then rethrow so the original request still fails (caller can show error if needed). So: try { await client.refresh(refreshToken); } catch { clear tokens; setToken(null); throw; }.
- **Option B:** Api-client could accept an optional `onRefreshFailed` callback and call it when refresh returns 401/4xx; AuthProvider would set it to “clear tokens and setToken(null)”. Prefer Option A to keep the ticket small and avoid api-client contract change unless needed.

**Acceptance criteria:**
- When a 401 occurs and refresh fails (e.g. refresh token expired), the app clears stored tokens and sets `isAuthenticated` to false so the user is shown the login (or landing) screen.
- No infinite loop of refresh attempts: after clearing tokens, subsequent requests either use no token or fail with 401 and do not trigger refresh (refresh only runs when we have setTokens + onUnauthorized).
- After “auto logout”, user can sign in again and use the app normally.

**How to test manually:**
1. Sign in on the app; then on the server or via a proxy, invalidate the refresh token (e.g. delete from `refresh_tokens` table or wait until it expires).
2. Trigger an authenticated request (e.g. open Lists or pull to refresh). First request 401s, refresh is attempted and fails.
3. Confirm the app clears session and shows login/landing (not an endless spinner or stuck screen). Sign in again and confirm lists load.

**Migration impact:** None. No schema or API changes; only client-side auth flow and token clearing.
