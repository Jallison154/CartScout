import * as listItemRepository from '../repositories/listItem.repository.js';
import * as listRepository from '../repositories/list.repository.js';
import * as storeRepository from '../repositories/store.repository.js';
import * as storeProductPriceRepository from '../repositories/storeProductPrice.repository.js';
import type { UserId } from '../db/schema.types.js';
import { HttpError } from '../utils/errors.js';
import * as productService from './product.service.js';

export type OptimizationStoreRef = {
  id: number;
  name: string;
  chain: string | null;
};

export type OptimizableLineInput = {
  list_item_id: number;
  canonical_product_id: number;
  product_display_name: string;
};

export type PriceEdgeInput = {
  canonical_product_id: number;
  store_id: number;
  price: number;
};

export type TotalByStore = {
  store: OptimizationStoreRef;
  total: number;
  priced_line_count: number;
  optimizable_line_count: number;
  is_complete: boolean;
  missing_list_item_ids: number[];
};

export type BestSingleStore = {
  store: OptimizationStoreRef;
  total: number;
};

export type CheapestPerItemLine = {
  list_item_id: number;
  canonical_product_id: number;
  product_display_name: string;
  cheapest: {
    store: OptimizationStoreRef;
    price: number;
  } | null;
};

export type SplitPlanStoreGroup = {
  store: OptimizationStoreRef;
  items: {
    list_item_id: number;
    canonical_product_id: number;
    product_display_name: string;
    price: number;
  }[];
  subtotal: number;
};

export type ListOptimizationResult = {
  list_id: number;
  stores_considered: OptimizationStoreRef[];
  optimizable_line_count: number;
  free_text_line_count: number;
  totals_by_store: TotalByStore[];
  best_single_store: BestSingleStore | null;
  cheapest_per_item: CheapestPerItemLine[];
  split_plan: SplitPlanStoreGroup[];
  split_total: number;
  savings: number | null;
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toStoreRef(s: { id: number; name: string; chain: string | null }): OptimizationStoreRef {
  return { id: s.id, name: s.name, chain: s.chain };
}

/**
 * Pure optimization over in-memory lines, stores, and price edges (testable).
 */
export function computeListOptimization(args: {
  list_id: number;
  stores: OptimizationStoreRef[];
  lines: OptimizableLineInput[];
  prices: PriceEdgeInput[];
}): ListOptimizationResult {
  const { list_id, stores, lines, prices } = args;

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const optimizable_line_count = lines.length;
  const free_text_line_count = 0;

  const priceByProductStore = new Map<number, Map<number, number>>();
  for (const e of prices) {
    if (!storeById.has(e.store_id)) {
      continue;
    }
    if (!priceByProductStore.has(e.canonical_product_id)) {
      priceByProductStore.set(e.canonical_product_id, new Map());
    }
    priceByProductStore.get(e.canonical_product_id)!.set(e.store_id, e.price);
  }

  function linePriceAtStore(
    productId: number,
    storeId: number,
  ): number | undefined {
    return priceByProductStore.get(productId)?.get(storeId);
  }

  const totals_by_store: TotalByStore[] = stores.map((store) => {
    let total = 0;
    const missing_list_item_ids: number[] = [];
    let priced_line_count = 0;
    for (const line of lines) {
      const p = linePriceAtStore(line.canonical_product_id, store.id);
      if (p === undefined) {
        missing_list_item_ids.push(line.list_item_id);
      } else {
        priced_line_count += 1;
        total += p;
      }
    }
    total = roundMoney(total);
    const is_complete =
      optimizable_line_count === 0 ? true : missing_list_item_ids.length === 0;
    return {
      store: toStoreRef(store),
      total,
      priced_line_count,
      optimizable_line_count,
      is_complete,
      missing_list_item_ids,
    };
  });

  const completeTotals = totals_by_store.filter((t) => t.is_complete);
  let best_single_store: BestSingleStore | null = null;
  if (completeTotals.length > 0) {
    const sorted = [...completeTotals].sort((a, b) => {
      if (a.total !== b.total) {
        return a.total - b.total;
      }
      return a.store.id - b.store.id;
    });
    const best = sorted[0]!;
    best_single_store = { store: best.store, total: best.total };
  }

  const cheapest_per_item: CheapestPerItemLine[] = lines.map((line) => {
    let bestStoreId: number | null = null;
    let bestPrice = Infinity;
    for (const store of stores) {
      const p = linePriceAtStore(line.canonical_product_id, store.id);
      if (p === undefined) {
        continue;
      }
      if (p < bestPrice || (p === bestPrice && (bestStoreId === null || store.id < bestStoreId))) {
        bestPrice = p;
        bestStoreId = store.id;
      }
    }
    if (bestStoreId === null) {
      return {
        list_item_id: line.list_item_id,
        canonical_product_id: line.canonical_product_id,
        product_display_name: line.product_display_name,
        cheapest: null,
      };
    }
    const store = storeById.get(bestStoreId)!;
    return {
      list_item_id: line.list_item_id,
      canonical_product_id: line.canonical_product_id,
      product_display_name: line.product_display_name,
      cheapest: { store: toStoreRef(store), price: roundMoney(bestPrice) },
    };
  });

  let split_total = 0;
  const byStoreId = new Map<
    number,
    {
      store: OptimizationStoreRef;
      items: SplitPlanStoreGroup['items'];
    }
  >();

  for (const row of cheapest_per_item) {
    if (!row.cheapest) {
      continue;
    }
    split_total += row.cheapest.price;
    const sid = row.cheapest.store.id;
    let g = byStoreId.get(sid);
    if (!g) {
      g = { store: row.cheapest.store, items: [] };
      byStoreId.set(sid, g);
    }
    g.items.push({
      list_item_id: row.list_item_id,
      canonical_product_id: row.canonical_product_id,
      product_display_name: row.product_display_name,
      price: row.cheapest.price,
    });
  }
  split_total = roundMoney(split_total);

  const split_plan: SplitPlanStoreGroup[] = [...byStoreId.values()]
    .map((g) => ({
      store: g.store,
      items: g.items,
      subtotal: roundMoney(g.items.reduce((s, i) => s + i.price, 0)),
    }))
    .sort((a, b) =>
      a.store.name.localeCompare(b.store.name, undefined, { sensitivity: 'base' }),
    );

  let savings: number | null = null;
  if (best_single_store !== null) {
    savings = roundMoney(best_single_store.total - split_total);
  }

  return {
    list_id,
    stores_considered: stores.map(toStoreRef),
    optimizable_line_count,
    free_text_line_count,
    totals_by_store,
    best_single_store,
    cheapest_per_item,
    split_plan,
    split_total,
    savings,
  };
}

export function optimizeListByStore(listId: number, userId: UserId): ListOptimizationResult {
  const list = listRepository.findListByIdForUser(listId, userId);
  if (!list) {
    throw new HttpError(404, 'List not found', 'NOT_FOUND');
  }

  const itemRows = listItemRepository.findItemsByListId(listId);
  const lines: OptimizableLineInput[] = [];
  let free_text_line_count = 0;

  const productIds: number[] = [];
  for (const row of itemRows) {
    if (row.canonical_product_id == null) {
      free_text_line_count += 1;
      continue;
    }
    productIds.push(row.canonical_product_id);
    lines.push({
      list_item_id: row.id,
      canonical_product_id: row.canonical_product_id,
      product_display_name: '',
    });
  }

  const productMap = productService.mapProductsByIds(productIds);
  for (const line of lines) {
    line.product_display_name =
      productMap.get(line.canonical_product_id)?.display_name ??
      `Product ${line.canonical_product_id}`;
  }

  let storeRows = storeRepository.listFavoriteStoresForUser(userId);
  if (storeRows.length === 0) {
    storeRows = storeRepository.listAllStores();
  }

  const stores: OptimizationStoreRef[] = storeRows.map((s) => toStoreRef(s));
  const storeIds = stores.map((s) => s.id);

  const priceRows = storeProductPriceRepository.findStorePricesForProductsAndStores(
    [...new Set(productIds)],
    storeIds,
  );

  const prices: PriceEdgeInput[] = priceRows.map((r) => ({
    canonical_product_id: r.canonical_product_id,
    store_id: r.store_id,
    price: r.price,
  }));

  const computed = computeListOptimization({
    list_id: listId,
    stores,
    lines,
    prices,
  });

  return {
    ...computed,
    free_text_line_count,
  };
}
