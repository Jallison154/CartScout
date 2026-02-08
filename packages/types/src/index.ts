/**
 * Shared types for API contract (web + mobile).
 */

export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface List {
  id: string;
  name: string;
  list_type: "current_week" | "next_order" | "custom";
  week_start: string | null;
  created_at: string;
  updated_at: string;
  items?: ListItem[];
}

export interface ListItem {
  id: string;
  canonical_product_id: string | null;
  free_text: string | null;
  quantity: number;
  estimated_weight_override?: string | null;
  sort_order: number;
  checked: number;
  created_at: string;
  display_name?: string | null;
  brand?: string | null;
  size_description?: string | null;
  upc?: string | null;
}

export interface ApiResponse<T> {
  data: T;
  meta?: { pagination?: { total: number; limit: number; offset: number } };
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface Store {
  id: string;
  external_id: string;
  name: string;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  chain?: string | null;
  source: string;
}

export interface CanonicalProduct {
  id: string;
  display_name: string;
  brand?: string | null;
  category?: string | null;
  size_description?: string | null;
  sold_by?: string;
  image_url?: string | null;
  source: string;
}
