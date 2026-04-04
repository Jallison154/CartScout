export { attachDatabase, closeDb, getDb } from './connection.js';
export { initializeDatabase, resetDatabaseConnectionForTests } from './init.js';
export { resolveDatabasePath, resolveSchemaPath, getServerRoot } from './paths.js';
export type { RefreshTokenRow, UserId, UserRow } from './schema.types.js';
export { withTransaction } from './transaction.js';

/** Re-export for services/repos that accept a DB handle (e.g. transactions). */
export type { DatabaseSync } from 'node:sqlite';
