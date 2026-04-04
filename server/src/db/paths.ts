import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Root of the `server` package (contains package.json, src/, dist/).
 * Works when this module lives in `src/db/*` or `dist/db/*`.
 */
export function getServerRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..');
}

/**
 * Resolve `schema.sql` for dev (`src/db`) and production (`dist/db` after copy).
 */
export function resolveSchemaPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const alongside = join(here, 'schema.sql');
  if (existsSync(alongside)) {
    return alongside;
  }

  const fromSrc = join(getServerRoot(), 'src', 'db', 'schema.sql');
  if (existsSync(fromSrc)) {
    return fromSrc;
  }

  throw new Error(
    'schema.sql not found (expected next to compiled db modules or at server/src/db/schema.sql)',
  );
}

/**
 * SQLite file path. Relative paths are resolved against the server package root.
 */
export function resolveDatabasePath(): string {
  const raw = process.env.DATABASE_PATH ?? 'data/cartscout.sqlite';
  if (isAbsolute(raw)) {
    return raw;
  }
  return join(getServerRoot(), raw);
}
