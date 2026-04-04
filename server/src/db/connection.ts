import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { resolveDatabasePath } from './paths.js';

let db: DatabaseSync | undefined;

function createDatabaseInstance(): DatabaseSync {
  const path = resolveDatabasePath();
  mkdirSync(dirname(path), { recursive: true });

  const instance = new DatabaseSync(path);
  instance.exec('PRAGMA journal_mode = WAL;');
  instance.exec('PRAGMA foreign_keys = ON;');

  return instance;
}

/**
 * Opens the DB file once and returns the shared instance (used by `getDb()` after init).
 */
export function attachDatabase(): DatabaseSync {
  if (!db) {
    db = createDatabaseInstance();
  }
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error('Database not initialized; call initializeDatabase() first');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    if (db.isOpen) {
      db.close();
    }
    db = undefined;
  }
}
