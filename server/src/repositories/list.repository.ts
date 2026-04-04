import { getDb } from '../db/index.js';
import type { ListRow, UserId } from '../db/schema.types.js';

export function findListsByUserId(userId: UserId): ListRow[] {
  return getDb()
    .prepare(
      `SELECT id, user_id, name, list_type, week_start, created_at, updated_at
       FROM lists WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC`,
    )
    .all(userId) as ListRow[];
}

export function findListByIdForUser(listId: number, userId: UserId): ListRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, user_id, name, list_type, week_start, created_at, updated_at
       FROM lists WHERE id = ? AND user_id = ?`,
    )
    .get(listId, userId) as ListRow | undefined;
}

export function insertList(
  userId: UserId,
  name: string,
  listType: string | null,
  weekStart: string | null,
): ListRow {
  const row = getDb()
    .prepare(
      `INSERT INTO lists (user_id, name, list_type, week_start)
       VALUES (?, ?, ?, ?)
       RETURNING id, user_id, name, list_type, week_start, created_at, updated_at`,
    )
    .get(userId, name, listType, weekStart) as ListRow | undefined;
  if (!row) {
    throw new Error('Failed to create list');
  }
  return row;
}

export function updateListForUser(
  listId: number,
  userId: UserId,
  patch: {
    name?: string;
    list_type?: string | null;
    week_start?: string | null;
  },
): ListRow | undefined {
  const keys: string[] = [];
  const values: Array<string | number | null> = [];

  if (patch.name !== undefined) {
    keys.push('name = ?');
    values.push(patch.name);
  }
  if (patch.list_type !== undefined) {
    keys.push('list_type = ?');
    values.push(patch.list_type);
  }
  if (patch.week_start !== undefined) {
    keys.push('week_start = ?');
    values.push(patch.week_start);
  }

  if (keys.length === 0) {
    return findListByIdForUser(listId, userId);
  }

  keys.push("updated_at = datetime('now')");
  values.push(listId, userId);

  const result = getDb()
    .prepare(`UPDATE lists SET ${keys.join(', ')} WHERE id = ? AND user_id = ?`)
    .run(...values);

  if (result.changes === 0) {
    return undefined;
  }

  return findListByIdForUser(listId, userId);
}

export function deleteListForUser(listId: number, userId: UserId): boolean {
  const result = getDb()
    .prepare('DELETE FROM lists WHERE id = ? AND user_id = ?')
    .run(listId, userId);
  return result.changes > 0;
}
