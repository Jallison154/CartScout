PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  list_type TEXT,
  week_start TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists (user_id);

CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  canonical_product_id INTEGER,
  free_text TEXT,
  quantity TEXT,
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  sort_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items (list_id);

CREATE TABLE IF NOT EXISTS canonical_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  size_description TEXT,
  barcode TEXT,
  image_url TEXT,
  source TEXT,
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canonical_products_display_name ON canonical_products (display_name);

-- Exact barcode lookup (partial unique: only non-null barcodes; multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_products_barcode_unique
  ON canonical_products (barcode) WHERE barcode IS NOT NULL;

-- Starter catalog (INSERT OR IGNORE keeps re-init idempotent)
INSERT OR IGNORE INTO canonical_products (id, display_name, brand, category, size_description, barcode, image_url, source, external_id)
VALUES
  (1, 'Milk', NULL, 'Dairy', NULL, NULL, NULL, 'seed', NULL),
  (2, 'Eggs', NULL, 'Dairy', NULL, NULL, NULL, 'seed', NULL),
  (3, 'Bread', NULL, 'Bakery', NULL, NULL, NULL, 'seed', NULL),
  (4, 'Chicken Breast', NULL, 'Meat', NULL, NULL, NULL, 'seed', NULL),
  (5, 'Rice', NULL, 'Pantry', NULL, NULL, NULL, 'seed', NULL),
  (6, 'Bananas', NULL, 'Produce', NULL, NULL, NULL, 'seed', NULL),
  (7, 'Apples', NULL, 'Produce', NULL, NULL, NULL, 'seed', NULL);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  chain TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stores_name ON stores (name);

CREATE TABLE IF NOT EXISTS user_favorite_stores (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_stores_user_id ON user_favorite_stores (user_id);

INSERT OR IGNORE INTO stores (id, name, chain, source)
VALUES
  (1, 'Walmart', 'Walmart', 'seed'),
  (2, 'Costco', 'Costco', 'seed');

CREATE TABLE IF NOT EXISTS store_product_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  canonical_product_id INTEGER NOT NULL REFERENCES canonical_products (id) ON DELETE CASCADE,
  price REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'estimate', 'receipt')),
  confidence_score REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (store_id, canonical_product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_product_prices_product_id
  ON store_product_prices (canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_prices_store_id
  ON store_product_prices (store_id);

-- Dev sample pricing (USD, illustrative). INSERT OR IGNORE is idempotent.
INSERT OR IGNORE INTO store_product_prices (id, store_id, canonical_product_id, price, source, confidence_score)
VALUES
  (1, 1, 1, 3.79, 'manual', NULL),
  (2, 2, 1, 5.49, 'estimate', 0.72),
  (3, 1, 2, 4.29, 'receipt', NULL),
  (4, 2, 2, 8.99, 'manual', NULL),
  (5, 1, 3, 2.50, 'estimate', 0.55),
  (6, 2, 3, 5.99, 'manual', NULL),
  (7, 1, 4, 12.99, 'manual', NULL),
  (8, 2, 4, 18.50, 'estimate', 0.65),
  (9, 1, 6, 1.29, 'receipt', NULL),
  (10, 2, 6, 3.49, 'manual', NULL);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores (id) ON DELETE SET NULL,
  purchase_date TEXT,
  total REAL,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts (created_at);

CREATE TABLE IF NOT EXISTS receipt_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  canonical_product_id INTEGER REFERENCES canonical_products (id) ON DELETE SET NULL,
  free_text TEXT,
  quantity TEXT,
  price REAL,
  confidence_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items (receipt_id);
