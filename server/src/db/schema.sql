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
  (1, 'Milk', 'Generic', 'Dairy', '1 gallon', '0001111050101', NULL, 'seed', NULL),
  (2, 'Eggs', 'Generic', 'Dairy', '12 large', '0001111050102', NULL, 'seed', NULL),
  (3, 'Bread', 'Generic', 'Bakery', '20 oz loaf', '0001111050103', NULL, 'seed', NULL),
  (4, 'Chicken Breast', 'Generic', 'Meat', '1 lb', '0001111050104', NULL, 'seed', NULL),
  (5, 'Rice', 'Generic', 'Pantry', '2 lb bag', '0001111050105', NULL, 'seed', NULL),
  (6, 'Bananas', NULL, 'Produce', 'per lb', '4011', NULL, 'seed', NULL),
  (7, 'Apples', NULL, 'Produce', 'per lb', '4131', NULL, 'seed', NULL),
  (8, 'Butter', 'Generic', 'Dairy', '1 lb', '0001111050108', NULL, 'seed', NULL),
  (9, 'Greek Yogurt', 'Generic', 'Dairy', '32 oz', '0001111050109', NULL, 'seed', NULL),
  (10, 'Ground Beef', 'Generic', 'Meat', '1 lb', '0001111050110', NULL, 'seed', NULL),
  (11, 'Pasta', 'Generic', 'Pantry', '16 oz', '0001111050111', NULL, 'seed', NULL),
  (12, 'Olive Oil', 'Generic', 'Pantry', '16.9 oz', '0001111050112', NULL, 'seed', NULL),
  (13, 'Tomatoes', NULL, 'Produce', 'per lb', '4664', NULL, 'seed', NULL),
  (14, 'Cheddar Cheese', 'Generic', 'Dairy', '8 oz', '0001111050114', NULL, 'seed', NULL);

-- Backfill barcodes / sizes for DBs that already ran the old seed (INSERT OR IGNORE no-ops)
UPDATE canonical_products SET
  size_description = COALESCE(size_description, CASE id
    WHEN 1 THEN '1 gallon' WHEN 2 THEN '12 large' WHEN 3 THEN '20 oz loaf'
    WHEN 4 THEN '1 lb' WHEN 5 THEN '2 lb bag' WHEN 6 THEN 'per lb' WHEN 7 THEN 'per lb'
    ELSE size_description END),
  barcode = COALESCE(barcode, CASE id
    WHEN 1 THEN '0001111050101' WHEN 2 THEN '0001111050102' WHEN 3 THEN '0001111050103'
    WHEN 4 THEN '0001111050104' WHEN 5 THEN '0001111050105' WHEN 6 THEN '4011' WHEN 7 THEN '4131'
    ELSE barcode END)
WHERE id BETWEEN 1 AND 7 AND source = 'seed';

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
  (2, 'Costco', 'Costco', 'seed'),
  (3, 'Kroger', 'Kroger', 'seed'),
  (4, 'Target', 'Target', 'seed');

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
  (10, 2, 6, 3.49, 'manual', NULL),
  (11, 3, 1, 3.49, 'manual', NULL),
  (12, 3, 2, 3.99, 'manual', NULL),
  (13, 3, 3, 2.79, 'estimate', 0.6),
  (14, 3, 4, 11.49, 'manual', NULL),
  (15, 3, 6, 0.59, 'receipt', NULL),
  (16, 3, 7, 1.49, 'manual', NULL),
  (17, 4, 1, 3.99, 'manual', NULL),
  (18, 4, 2, 4.49, 'estimate', 0.7),
  (19, 4, 3, 2.99, 'manual', NULL),
  (20, 4, 5, 3.29, 'manual', NULL),
  (21, 4, 7, 1.79, 'manual', NULL),
  (22, 1, 5, 2.89, 'manual', NULL),
  (23, 2, 5, 6.49, 'manual', NULL),
  (24, 1, 7, 1.59, 'estimate', 0.58),
  (25, 2, 7, 4.99, 'manual', NULL),
  (26, 1, 8, 4.49, 'manual', NULL),
  (27, 3, 8, 4.29, 'manual', NULL),
  (28, 4, 8, 4.79, 'estimate', 0.62),
  (29, 1, 9, 5.49, 'manual', NULL),
  (30, 3, 9, 4.99, 'receipt', NULL),
  (31, 1, 10, 6.99, 'manual', NULL),
  (32, 2, 10, 14.99, 'estimate', 0.68),
  (33, 3, 10, 6.49, 'manual', NULL),
  (34, 1, 11, 1.49, 'manual', NULL),
  (35, 3, 11, 1.29, 'manual', NULL),
  (36, 4, 11, 1.59, 'estimate', 0.55),
  (37, 1, 12, 8.99, 'manual', NULL),
  (38, 2, 12, 12.99, 'manual', NULL),
  (39, 3, 13, 2.49, 'receipt', NULL),
  (40, 4, 13, 2.79, 'manual', NULL),
  (41, 1, 14, 3.29, 'manual', NULL),
  (42, 3, 14, 2.99, 'manual', NULL);

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
