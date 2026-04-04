import { getDb } from '../db/index.js';
import type { StoreRow, UserId } from '../db/schema.types.js';

const STORE_COLUMNS = `id, name, chain, source, created_at`;

export function listAllStores(): StoreRow[] {
  return getDb()
    .prepare(
      `SELECT ${STORE_COLUMNS} FROM stores
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all() as StoreRow[];
}

export function findStoreById(id: number): StoreRow | undefined {
  return getDb()
    .prepare(`SELECT ${STORE_COLUMNS} FROM stores WHERE id = ?`)
    .get(id) as StoreRow | undefined;
}

/** Favorites for a user, most recently added first. */
export function listFavoriteStoresForUser(userId: UserId): StoreRow[] {
  return getDb()
    .prepare(
      `SELECT s.id, s.name, s.chain, s.source, s.created_at
       FROM user_favorite_stores ufs
       INNER JOIN stores s ON s.id = ufs.store_id
       WHERE ufs.user_id = ?
       ORDER BY ufs.created_at DESC, s.name COLLATE NOCASE ASC`,
    )
    .all(userId) as StoreRow[];
}

export function insertUserFavoriteStore(userId: UserId, storeId: number): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO user_favorite_stores (user_id, store_id)
       VALUES (?, ?)`,
    )
    .run(userId, storeId);
}

/** @returns number of rows deleted (0 or 1) */
export function deleteUserFavoriteStore(userId: UserId, storeId: number): number {
  const result = getDb()
    .prepare(
      `DELETE FROM user_favorite_stores
       WHERE user_id = ? AND store_id = ?`,
    )
    .run(userId, storeId);
  return Number(result.changes);
}
