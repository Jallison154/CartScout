import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './connection.js';

/**
 * Runs `fn` inside a single SQLite transaction (commit on success, rollback on throw).
 */
export function withTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore secondary failure
    }
    throw err;
  }
}
