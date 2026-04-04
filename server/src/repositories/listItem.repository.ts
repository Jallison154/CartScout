import { getDb } from '../db/index.js';
import type { ListItemRow } from '../db/schema.types.js';

export function findItemsByListId(listId: number): ListItemRow[] {
  return getDb()
    .prepare(
      `SELECT id, list_id, canonical_product_id, free_text, quantity, checked, sort_order, created_at
       FROM list_items
       WHERE list_id = ?
       ORDER BY (sort_order IS NULL), sort_order ASC, id ASC`,
    )
    .all(listId) as ListItemRow[];
}

export function getNextSortOrder(listId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM list_items WHERE list_id = ?`,
    )
    .get(listId) as { next_order: number } | undefined;
  return row?.next_order ?? 0;
}

export function findItemByIdForList(itemId: number, listId: number): ListItemRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, list_id, canonical_product_id, free_text, quantity, checked, sort_order, created_at
       FROM list_items WHERE id = ? AND list_id = ?`,
    )
    .get(itemId, listId) as ListItemRow | undefined;
}

export function insertItem(
  listId: number,
  fields: {
    free_text: string | null;
    quantity: string | null;
    sort_order: number | null;
    canonical_product_id: number | null;
    checked?: 0 | 1;
  },
): ListItemRow {
  const checked = fields.checked ?? 0;
  const row = getDb()
    .prepare(
      `INSERT INTO list_items (list_id, canonical_product_id, free_text, quantity, checked, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, list_id, canonical_product_id, free_text, quantity, checked, sort_order, created_at`,
    )
    .get(
      listId,
      fields.canonical_product_id,
      fields.free_text,
      fields.quantity,
      checked,
      fields.sort_order,
    ) as ListItemRow | undefined;
  if (!row) {
    throw new Error('Failed to create list item');
  }
  return row;
}

export function updateItemForList(
  itemId: number,
  listId: number,
  patch: {
    free_text?: string | null;
    quantity?: string | null;
    checked?: boolean;
    sort_order?: number | null;
    canonical_product_id?: number | null;
  },
): ListItemRow | undefined {
  const keys: string[] = [];
  const values: Array<string | number | null> = [];

  if (patch.free_text !== undefined) {
    keys.push('free_text = ?');
    values.push(patch.free_text);
  }
  if (patch.quantity !== undefined) {
    keys.push('quantity = ?');
    values.push(patch.quantity);
  }
  if (patch.checked !== undefined) {
    keys.push('checked = ?');
    values.push(patch.checked ? 1 : 0);
  }
  if (patch.sort_order !== undefined) {
    keys.push('sort_order = ?');
    values.push(patch.sort_order);
  }
  if (patch.canonical_product_id !== undefined) {
    keys.push('canonical_product_id = ?');
    values.push(patch.canonical_product_id);
  }

  if (keys.length === 0) {
    return findItemByIdForList(itemId, listId);
  }

  values.push(itemId, listId);

  const result = getDb()
    .prepare(`UPDATE list_items SET ${keys.join(', ')} WHERE id = ? AND list_id = ?`)
    .run(...values);

  if (result.changes === 0) {
    return undefined;
  }

  return findItemByIdForList(itemId, listId);
}

export function deleteItemForList(itemId: number, listId: number): boolean {
  const result = getDb()
    .prepare('DELETE FROM list_items WHERE id = ? AND list_id = ?')
    .run(itemId, listId);
  return result.changes > 0;
}
