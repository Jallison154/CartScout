import type { CanonicalProductRow } from '../db/schema.types.js';
import * as productRepository from '../repositories/product.repository.js';
import * as storeProductPriceRepository from '../repositories/storeProductPrice.repository.js';
import type { StoreProductPriceWithStoreRow } from '../repositories/storeProductPrice.repository.js';
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

const PRICE_SOURCES = new Set(['manual', 'estimate', 'receipt']);

export type PriceSource = 'manual' | 'estimate' | 'receipt';

export type StoreProductPricePublic = {
  id: number;
  store: {
    id: number;
    name: string;
    chain: string | null;
  };
  price: number;
  source: PriceSource;
  confidence_score: number | null;
  updated_at: string;
  created_at: string;
};

function toStoreProductPricePublic(row: StoreProductPriceWithStoreRow): StoreProductPricePublic {
  if (!PRICE_SOURCES.has(row.source)) {
    throw new Error(`Invalid price source in database: ${row.source}`);
  }
  return {
    id: row.id,
    store: {
      id: row.store_id,
      name: row.store_name,
      chain: row.store_chain,
    },
    price: row.price,
    source: row.source as PriceSource,
    confidence_score: row.confidence_score,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

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

export function getProductByBarcode(barcode: string): { product: ProductPublic } {
  const row = productRepository.findCanonicalProductByBarcode(barcode);
  if (!row) {
    throw new HttpError(404, 'No product found for this barcode', 'BARCODE_NOT_FOUND');
  }
  return { product: toProductPublic(row) };
}

/** Store-specific prices for one canonical product (empty array if none). */
export function listProductStorePrices(canonicalProductId: number): {
  prices: StoreProductPricePublic[];
} {
  if (!productRepository.findCanonicalProductById(canonicalProductId)) {
    throw new HttpError(404, 'Product not found', 'NOT_FOUND');
  }
  const rows = storeProductPriceRepository.findStorePricesByCanonicalProductId(
    canonicalProductId,
  );
  return { prices: rows.map(toStoreProductPricePublic) };
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
