export type OptimizationStoreRef = {
  id: number;
  name: string;
  chain: string | null;
};

export type ListOptimizationResult = {
  list_id: number;
  stores_considered: OptimizationStoreRef[];
  optimizable_line_count: number;
  free_text_line_count: number;
  totals_by_store: {
    store: OptimizationStoreRef;
    total: number;
    priced_line_count: number;
    optimizable_line_count: number;
    is_complete: boolean;
    missing_list_item_ids: number[];
  }[];
  best_single_store: {
    store: OptimizationStoreRef;
    total: number;
  } | null;
  cheapest_per_item: {
    list_item_id: number;
    canonical_product_id: number;
    product_display_name: string;
    cheapest: {
      store: OptimizationStoreRef;
      price: number;
    } | null;
  }[];
  split_plan: {
    store: OptimizationStoreRef;
    items: {
      list_item_id: number;
      canonical_product_id: number;
      product_display_name: string;
      price: number;
    }[];
    subtotal: number;
  }[];
  split_total: number;
  savings: number | null;
};
