# Deferred (post-MVP)

Items below are explicitly out of scope for MVP. Revisit when scaling or hardening further.

- **Rate limiting** — Per-IP or per-user limits on auth and API to prevent abuse.
- **Pagination** — Cursor or offset pagination for lists, stores, product search.
- **Read replicas / connection pooling** — When moving off single SQLite/single process.
- **Audit trail** — Who changed what and when (e.g. for shared lists or support).
- **Soft delete** — `deleted_at` and restore instead of hard delete.
- **Idempotency keys** — For POST/PATCH to avoid duplicate creates/updates on retry.
- **E2E / integration tests** — Automated tests for auth and list flows.
- **N+1 fix for list items** — Single query or batch for “lists with items” at scale.
- **Request timeouts** — Bound how long a request can run.
- **Revoke all sessions** — Invalidate all refresh tokens for a user (e.g. on password change).
- **Refresh token cleanup job** — Cron to delete expired rows (startup prune is in place for MVP).
- **CDN / cache headers** — For store list or product catalog if they become static-ish.
- **CSRF** — When adding cookie-based web sessions.
- **Encryption at rest** — For DB or sensitive columns if required by policy.
