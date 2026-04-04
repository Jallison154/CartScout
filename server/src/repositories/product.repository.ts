import { getDb } from '../db/index.js';
import type { CanonicalProductRow } from '../db/schema.types.js';

const SELECT_COLUMNS = `id, display_name, brand, category, size_description, barcode, image_url, source, external_id, created_at`;

export function findCanonicalProductById(id: number): CanonicalProductRow | undefined {
  return getDb()
    .prepare(`SELECT ${SELECT_COLUMNS} FROM canonical_products WHERE id = ?`)
    .get(id) as CanonicalProductRow | undefined;
}

/** Exact match on `barcode` (case-sensitive, as stored). */
export function findCanonicalProductByBarcode(barcode: string): CanonicalProductRow | undefined {
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM canonical_products WHERE barcode = ? LIMIT 1`,
    )
    .get(barcode) as CanonicalProductRow | undefined;
}

export function findCanonicalProductsByIds(ids: number[]): CanonicalProductRow[] {
  if (ids.length === 0) {
    return [];
  }
  const unique = [...new Set(ids)];
  const placeholders = unique.map(() => '?').join(', ');
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM canonical_products WHERE id IN (${placeholders})`,
    )
    .all(...unique) as CanonicalProductRow[];
}

/**
 * Case-insensitive substring match on display_name or brand (max `limit` rows).
 */
export function searchCanonicalProductsByNameOrBrand(
  q: string,
  limit: number,
): CanonicalProductRow[] {
  const pattern = `%${q}%`;
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM canonical_products
       WHERE display_name LIKE ?
          OR (brand IS NOT NULL AND brand LIKE ?)
       ORDER BY display_name COLLATE NOCASE ASC
       LIMIT ?`,
    )
    .all(pattern, pattern, limit) as CanonicalProductRow[];
}
