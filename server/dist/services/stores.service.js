/**
 * Stores and user favorite stores. Routes call here; no DB in routes.
 */
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { AppError } from "../types/index.js";
const STORE_COLUMNS = "id, external_id, name, address_line, city, state, zip_code, chain, source";
/** Get all stores (for settings picker). */
export function getAllStores() {
    return db
        .prepare(`SELECT ${STORE_COLUMNS} FROM stores ORDER BY chain, name`)
        .all();
}
/** Get favorite store IDs for a user. */
export function getFavoriteStoreIds(userId) {
    const rows = db
        .prepare("SELECT store_id FROM user_favorite_stores WHERE user_id = ?")
        .all(userId);
    return rows.map((r) => r.store_id);
}
/** Add a store to user's favorites. Returns updated list of favorite IDs. Throws if store_id invalid or store not found. */
export function addFavorite(userId, storeId) {
    if (!storeId || typeof storeId !== "string") {
        throw AppError.validation("store_id is required");
    }
    const store = db.prepare("SELECT id FROM stores WHERE id = ?").get(storeId);
    if (!store) {
        throw AppError.notFound("Store not found");
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO user_favorite_stores (id, user_id, store_id, created_at) VALUES (?, ?, ?, ?)").run(id, userId, storeId, now);
    return getFavoriteStoreIds(userId);
}
/** Remove a store from user's favorites. Returns updated list of favorite IDs. */
export function removeFavorite(userId, storeId) {
    db.prepare("DELETE FROM user_favorite_stores WHERE user_id = ? AND store_id = ?").run(userId, storeId);
    return getFavoriteStoreIds(userId);
}
