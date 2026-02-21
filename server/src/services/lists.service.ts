/**
 * List and list-item business logic. Routes call here; no DB access in routes.
 */
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { AppError } from "../types/index.js";

export type ListRow = {
  id: string;
  name: string;
  list_type: string;
  week_start: string | null;
  created_at: string;
  updated_at: string;
};

const LIST_COLUMNS = "id, name, list_type, week_start, created_at, updated_at";

const LIST_ITEM_SELECT =
  `SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.estimated_weight_override, li.sort_order, li.checked, li.created_at,
    cp.display_name, cp.brand, cp.size_description, cp.upc
   FROM list_items li
   LEFT JOIN canonical_products cp ON cp.id = li.canonical_product_id
   WHERE li.list_id = ?
   ORDER BY li.sort_order, li.created_at`;

/** Get all lists for a user; optionally include items. */
export function getListsForUser(
  userId: string,
  includeItems: boolean
): Array<ListRow & { items?: Array<Record<string, unknown>> }> {
  const lists = db
    .prepare(`SELECT ${LIST_COLUMNS} FROM lists WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as ListRow[];

  if (!includeItems) return lists;

  return lists.map((list) => {
    const items = db.prepare(LIST_ITEM_SELECT).all(list.id) as Array<Record<string, unknown>>;
    return { ...list, items };
  });
}

/** Get a single list by id if it belongs to the user, or null. */
export function getListForUser(userId: string, listId: string): (ListRow & { items?: Array<Record<string, unknown>> }) | null {
  const list = db
    .prepare(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ? AND user_id = ?`)
    .get(listId, userId) as ListRow | undefined;
  if (!list) return null;
  return list;
}

/** Get a single list by id for user, or throw AppError.notFound. */
export function requireListForUser(userId: string, listId: string): ListRow {
  const list = getListForUser(userId, listId);
  if (!list) throw AppError.notFound("List not found");
  return list as ListRow;
}

/** Get list with optional items. Throws if list not found for user. */
export function getListForUserWithItems(
  userId: string,
  listId: string,
  includeItems: boolean
): ListRow | (ListRow & { items: Array<Record<string, unknown>> }) {
  const list = getListForUser(userId, listId);
  if (!list) throw AppError.notFound("List not found");
  if (!includeItems) return list as ListRow;
  const items = db.prepare(LIST_ITEM_SELECT).all(listId) as Array<Record<string, unknown>>;
  return { ...list, items };
}

/** Get store IDs for a list (caller must ensure list exists and user has access). */
export function getListStoreIds(listId: string): string[] {
  const rows = db.prepare("SELECT store_id FROM list_stores WHERE list_id = ?").all(listId) as Array<{ store_id: string }>;
  return rows.map((r) => r.store_id);
}

/** Create a list for the user. Returns the created list. */
export function createList(
  userId: string,
  body: { name?: string; list_type?: string; week_start?: string | null }
): ListRow {
  const listName = (body.name && typeof body.name === "string") ? body.name.trim() : "New list";
  const type = body.list_type === "current_week" || body.list_type === "next_order" ? body.list_type : "custom";
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO lists (id, user_id, name, list_type, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, userId, listName, type, body.week_start ?? null, now, now);
  return db.prepare(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`).get(id) as ListRow;
}

/** Update a list. Returns the updated list. Throws if list not found for user. */
export function updateList(
  userId: string,
  listId: string,
  body: { name?: string; list_type?: string; week_start?: string | null }
): ListRow {
  requireListForUser(userId, listId);
  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.name !== undefined && typeof body.name === "string") {
    updates.push("name = ?");
    values.push(body.name.trim());
  }
  if (body.list_type === "current_week" || body.list_type === "next_order" || body.list_type === "custom") {
    updates.push("list_type = ?");
    values.push(body.list_type);
  }
  if (body.week_start !== undefined) {
    updates.push("week_start = ?");
    values.push(body.week_start === "" || body.week_start === null ? null : body.week_start);
  }
  if (updates.length === 0) {
    return db.prepare(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`).get(listId) as ListRow;
  }
  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(listId);
  db.prepare(`UPDATE lists SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`).get(listId) as ListRow;
}

/** Delete a list. Throws if list not found for user. */
export function deleteList(userId: string, listId: string): void {
  requireListForUser(userId, listId);
  db.prepare("DELETE FROM lists WHERE id = ? AND user_id = ?").run(listId, userId);
}

/** Set store IDs for a list. Returns the new store IDs. Throws if list not found for user. */
export function setListStores(userId: string, listId: string, storeIds: string[]): string[] {
  requireListForUser(userId, listId);
  const ids = storeIds.filter((s): s is string => typeof s === "string");
  db.prepare("DELETE FROM list_stores WHERE list_id = ?").run(listId);
  const now = new Date().toISOString();
  for (const storeId of ids) {
    const row = db.prepare("SELECT id FROM stores WHERE id = ?").get(storeId);
    if (row) {
      db.prepare("INSERT INTO list_stores (id, list_id, store_id, created_at) VALUES (?, ?, ?, ?)").run(uuidv4(), listId, storeId, now);
    }
  }
  return getListStoreIds(listId);
}

const LIST_ITEM_WITH_PRODUCT =
  "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked, li.created_at, cp.display_name, cp.brand, cp.size_description FROM list_items li LEFT JOIN canonical_products cp ON cp.id = li.canonical_product_id WHERE li.id = ?";

/** Add an item to a list. Returns the created item. Body must be validated (e.g. parseAddListItemBody). Throws if list not found. */
export function addListItem(
  userId: string,
  listId: string,
  body: { canonical_product_id?: string | null; free_text?: string | null; quantity?: number }
): Record<string, unknown> {
  requireListForUser(userId, listId);
  const productId = body.canonical_product_id && body.canonical_product_id.trim() ? body.canonical_product_id.trim() : null;
  const freeText = body.free_text && typeof body.free_text === "string" && body.free_text.trim() ? body.free_text.trim() : null;
  if (!productId && !freeText) {
    throw AppError.validation("Provide canonical_product_id or free_text");
  }
  const qty = typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1;
  const itemId = uuidv4();
  const now = new Date().toISOString();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM list_items WHERE list_id = ?").get(listId) as { next: number };
  db.prepare(
    "INSERT INTO list_items (id, list_id, canonical_product_id, free_text, quantity, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(itemId, listId, productId, freeText, qty, maxOrder.next, now);
  return db.prepare(LIST_ITEM_WITH_PRODUCT).get(itemId) as Record<string, unknown>;
}

/** Update a list item. Returns the updated item. Throws if list or item not found. */
export function updateListItem(
  userId: string,
  listId: string,
  itemId: string,
  body: { quantity?: number; checked?: boolean }
): Record<string, unknown> {
  requireListForUser(userId, listId);
  const updates: string[] = [];
  const values: unknown[] = [];
  if (typeof body.quantity === "number" && body.quantity > 0) {
    updates.push("quantity = ?");
    values.push(body.quantity);
  }
  if (typeof body.checked === "boolean") {
    updates.push("checked = ?");
    values.push(body.checked ? 1 : 0);
  }
  if (updates.length === 0) {
    const item = db.prepare(
      "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked FROM list_items li WHERE li.id = ? AND li.list_id = ?"
    ).get(itemId, listId) as Record<string, unknown> | undefined;
    if (!item) throw AppError.notFound("Item not found");
    return item;
  }
  values.push(itemId, listId);
  const result = db.prepare(`UPDATE list_items SET ${updates.join(", ")} WHERE id = ? AND list_id = ?`).run(...values);
  if (result.changes === 0) throw AppError.notFound("Item not found");
  return db.prepare(
    "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked FROM list_items li WHERE li.id = ? AND li.list_id = ?"
  ).get(itemId, listId) as Record<string, unknown>;
}

/** Delete a list item. Throws if list or item not found. */
export function deleteListItem(userId: string, listId: string, itemId: string): void {
  requireListForUser(userId, listId);
  const result = db.prepare("DELETE FROM list_items WHERE id = ? AND list_id = ?").run(itemId, listId);
  if (result.changes === 0) throw AppError.notFound("Item not found");
}
