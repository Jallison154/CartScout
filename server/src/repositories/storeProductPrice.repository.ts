import { getDb } from '../db/index.js';
import type { StoreProductPriceRow } from '../db/schema.types.js';

/** Row from join with `stores` for list-by-product queries. */
export type StoreProductPriceWithStoreRow = StoreProductPriceRow & {
  store_name: string;
  store_chain: string | null;
};

export function findStorePricesByCanonicalProductId(
  canonicalProductId: number,
): StoreProductPriceWithStoreRow[] {
  return getDb()
    .prepare(
      `SELECT
         spp.id,
         spp.store_id,
         spp.canonical_product_id,
         spp.price,
         spp.source,
         spp.confidence_score,
         spp.updated_at,
         spp.created_at,
         s.name AS store_name,
         s.chain AS store_chain
       FROM store_product_prices spp
       INNER JOIN stores s ON s.id = spp.store_id
       WHERE spp.canonical_product_id = ?
       ORDER BY s.name COLLATE NOCASE ASC`,
    )
    .all(canonicalProductId) as StoreProductPriceWithStoreRow[];
}

/**
 * All prices for the given products limited to the given stores (for optimization).
 */
export function findStorePricesForProductsAndStores(
  canonicalProductIds: number[],
  storeIds: number[],
): StoreProductPriceWithStoreRow[] {
  const products = [...new Set(canonicalProductIds)].filter((id) => id > 0);
  const stores = [...new Set(storeIds)].filter((id) => id > 0);
  if (products.length === 0 || stores.length === 0) {
    return [];
  }
  const pPh = products.map(() => '?').join(', ');
  const sPh = stores.map(() => '?').join(', ');
  return getDb()
    .prepare(
      `SELECT
         spp.id,
         spp.store_id,
         spp.canonical_product_id,
         spp.price,
         spp.source,
         spp.confidence_score,
         spp.updated_at,
         spp.created_at,
         s.name AS store_name,
         s.chain AS store_chain
       FROM store_product_prices spp
       INNER JOIN stores s ON s.id = spp.store_id
       WHERE spp.canonical_product_id IN (${pPh})
         AND spp.store_id IN (${sPh})
       ORDER BY spp.canonical_product_id ASC, s.name COLLATE NOCASE ASC`,
    )
    .all(...products, ...stores) as StoreProductPriceWithStoreRow[];
}

/**
 * Inserts or updates a price row for (store, product). Used when confirming a receipt line
 * with a known catalog product and unit price at the receipt's store.
 */
export function upsertReceiptPriceSnapshot(args: {
  store_id: number;
  canonical_product_id: number;
  price: number;
  confidence_score: number | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO store_product_prices (store_id, canonical_product_id, price, source, confidence_score)
       VALUES (?, ?, ?, 'receipt', ?)
       ON CONFLICT (store_id, canonical_product_id) DO UPDATE SET
         price = excluded.price,
         source = excluded.source,
         confidence_score = excluded.confidence_score,
         updated_at = datetime('now')`,
    )
    .run(
      args.store_id,
      args.canonical_product_id,
      args.price,
      args.confidence_score,
    );
}
