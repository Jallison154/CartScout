import type { CanonicalProduct } from '@/types/products';

export type GroceryList = {
  id: number;
  name: string;
  list_type: string | null;
  week_start: string | null;
  created_at: string;
  updated_at: string;
};

export type ListItem = {
  id: number;
  list_id: number;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  checked: boolean;
  sort_order: number | null;
  created_at: string;
  product?: CanonicalProduct | null;
};
