import * as productRepository from '../repositories/product.repository.js';
import type { CanonicalProductRow } from '../db/schema.types.js';
import { HttpError } from '../utils/errors.js';

const SEARCH_LIMIT = 10;

export type ProductPublic = {
  id: number;
  display_name: string;
  brand: string | null;
  category: string | null;
  size_description: string | null;
  barcode: string | null;
  image_url: string | null;
  source: string | null;
  external_id: string | null;
  created_at: string;
};

export function toProductPublic(row: CanonicalProductRow): ProductPublic {
  return {
    id: row.id,
    display_name: row.display_name,
    brand: row.brand,
    category: row.category,
    size_description: row.size_description,
    barcode: row.barcode,
    image_url: row.image_url,
    source: row.source,
    external_id: row.external_id,
    created_at: row.created_at,
  };
}

export function searchProducts(query: string): { products: ProductPublic[] } {
  const q = query.trim();
  if (!q) {
    throw new HttpError(400, 'Query parameter q is required', 'VALIDATION_ERROR');
  }
  if (q.length > 200) {
    throw new HttpError(400, 'Query is too long', 'VALIDATION_ERROR');
  }
  const rows = productRepository.searchCanonicalProductsByNameOrBrand(q, SEARCH_LIMIT);
  return { products: rows.map(toProductPublic) };
}

export function getProductById(id: number): { product: ProductPublic } {
  const row = productRepository.findCanonicalProductById(id);
  if (!row) {
    throw new HttpError(404, 'Product not found', 'NOT_FOUND');
  }
  return { product: toProductPublic(row) };
}

/** Returns a map of id → row for list item hydration. */
export function mapProductsByIds(ids: number[]): Map<number, ProductPublic> {
  const rows = productRepository.findCanonicalProductsByIds(ids);
  const map = new Map<number, ProductPublic>();
  for (const row of rows) {
    map.set(row.id, toProductPublic(row));
  }
  return map;
}

export function assertCanonicalProductExists(id: number): void {
  if (!productRepository.findCanonicalProductById(id)) {
    throw new HttpError(400, 'Unknown canonical product', 'UNKNOWN_PRODUCT');
  }
}
