/** Row shapes for `users` — use with `getDb().prepare(...)` `.get()` / `.all()`. */

export type UserId = number;

export type UserRow = {
  id: UserId;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type RefreshTokenRow = {
  id: number;
  user_id: UserId;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export type ListRow = {
  id: number;
  user_id: UserId;
  name: string;
  list_type: string | null;
  week_start: string | null;
  created_at: string;
  updated_at: string;
};

/** SQLite stores `checked` as 0 | 1 */
export type ListItemRow = {
  id: number;
  list_id: number;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  checked: 0 | 1;
  sort_order: number | null;
  created_at: string;
};

export type CanonicalProductRow = {
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

export type StoreRow = {
  id: number;
  name: string;
  chain: string | null;
  source: string | null;
  created_at: string;
};

export type UserFavoriteStoreRow = {
  user_id: UserId;
  store_id: number;
  created_at: string;
};
