import { getDb } from '../db/index.js';
import type { UserRow } from '../db/schema.types.js';

export function findUserByEmail(email: string): UserRow | undefined {
  const row = getDb()
    .prepare('SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRow | undefined;
  return row;
}

export function findUserById(id: number): Pick<UserRow, 'id' | 'email'> | undefined {
  return getDb()
    .prepare('SELECT id, email FROM users WHERE id = ?')
    .get(id) as Pick<UserRow, 'id' | 'email'> | undefined;
}

export function createUser(email: string, passwordHash: string): Pick<UserRow, 'id' | 'email'> {
  const normalized = email.toLowerCase();
  const row = getDb()
    .prepare(
      `INSERT INTO users (email, password_hash) VALUES (?, ?)
       RETURNING id, email`,
    )
    .get(normalized, passwordHash) as Pick<UserRow, 'id' | 'email'> | undefined;
  if (!row) {
    throw new Error('Failed to create user');
  }
  return row;
}
