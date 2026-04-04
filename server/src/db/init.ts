import { readFileSync } from 'node:fs';
import { attachDatabase, closeDb } from './connection.js';
import { resolveSchemaPath } from './paths.js';

/**
 * Ensures the database file exists, applies `schema.sql`, and attaches the process-wide connection.
 * Idempotent for schema: uses `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
 */
export function initializeDatabase(): void {
  const schemaPath = resolveSchemaPath();
  const schemaSql = readFileSync(schemaPath, 'utf8');
  const instance = attachDatabase();
  instance.exec(schemaSql);
  console.info(`[cartscout] applied schema from ${schemaPath}`);
}

/**
 * Closes the singleton connection (e.g. tests or graceful shutdown).
 */
export function resetDatabaseConnectionForTests(): void {
  closeDb();
}
