import { getDb } from '../db/index.js';

export type RefreshTokenRecord = {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
};

export function insertRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAtIso: string,
): number {
  const row = getDb()
    .prepare(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)
       RETURNING id`,
    )
    .get(userId, tokenHash, expiresAtIso) as { id: number } | undefined;
  if (!row) {
    throw new Error('Failed to store refresh token');
  }
  return row.id;
}

export function findRefreshTokenById(id: number): RefreshTokenRecord | undefined {
  return getDb()
    .prepare(
      'SELECT id, user_id, token_hash, expires_at FROM refresh_tokens WHERE id = ?',
    )
    .get(id) as RefreshTokenRecord | undefined;
}

export function deleteRefreshTokenById(id: number): void {
  getDb().prepare('DELETE FROM refresh_tokens WHERE id = ?').run(id);
}
