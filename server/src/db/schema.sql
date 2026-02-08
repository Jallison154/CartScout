-- CartScout schema: mobile-ready, token-based auth, lists, and future features.
-- SQLite-compatible.

-- Users (for auth; tokens returned in JSON for mobile clients)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens (rotate on use; store per user for mobile)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Lists (user_id required; household_id optional for shared lists later)
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  list_type TEXT NOT NULL DEFAULT 'custom' CHECK (list_type IN ('current_week','next_order','custom')),
  week_start TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);

-- Canonical products (from retailer adapters)
CREATE TABLE IF NOT EXISTS canonical_products (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  size_description TEXT,
  sold_by TEXT NOT NULL DEFAULT 'unit' CHECK (sold_by IN ('unit','weight')),
  default_estimated_weight TEXT,
  image_url TEXT,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  upc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_canonical_products_external_id ON canonical_products(source, external_id);
CREATE INDEX IF NOT EXISTS idx_canonical_products_display_name ON canonical_products(display_name);

-- Seed example products (for add-item suggestions; more come from retailer adapters later)
INSERT OR IGNORE INTO canonical_products (id, display_name, brand, source, external_id) VALUES
  ('prod-milk-1', 'Whole Milk 1 Gallon', 'Generic', 'seed', 'milk-1'),
  ('prod-bread-1', 'White Bread', 'Generic', 'seed', 'bread-1'),
  ('prod-eggs-1', 'Large Eggs 12ct', 'Generic', 'seed', 'eggs-1'),
  ('prod-banana-1', 'Bananas', 'Generic', 'seed', 'banana-1'),
  ('prod-apple-1', 'Gala Apples', 'Generic', 'seed', 'apple-1');

-- List items (canonical_product_id or free_text for suggestions)
CREATE TABLE IF NOT EXISTS list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  canonical_product_id TEXT REFERENCES canonical_products(id),
  free_text TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  estimated_weight_override TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);

-- Stores (retailer locations)
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address_line TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  chain TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Store product price cache
CREATE TABLE IF NOT EXISTS store_product_prices (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  canonical_product_id TEXT NOT NULL REFERENCES canonical_products(id),
  price_regular REAL,
  price_promo REAL,
  unit_price_regular REAL,
  unit_price_promo REAL,
  currency TEXT DEFAULT 'USD',
  fetched_at TEXT NOT NULL,
  UNIQUE(store_id, canonical_product_id)
);

-- User favorite stores
CREATE TABLE IF NOT EXISTS user_favorite_stores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, store_id)
);

-- Seed a few example stores (user can select which to use per list later)
INSERT OR IGNORE INTO stores (id, external_id, name, chain, source) VALUES
  ('store-kroger-1', 'kroger-1', 'Kroger', 'Kroger', 'kroger'),
  ('store-walmart-1', 'walmart-1', 'Walmart', 'Walmart', 'walmart'),
  ('store-target-1', 'target-1', 'Target', 'Target', 'target'),
  ('store-wholefoods-1', 'wholefoods-1', 'Whole Foods', 'Whole Foods', 'wholefoods'),
  ('store-publix-1', 'publix-1', 'Publix', 'Publix', 'publix');

-- Push notification device tokens (for list reminders, price updates)
CREATE TABLE IF NOT EXISTS push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
