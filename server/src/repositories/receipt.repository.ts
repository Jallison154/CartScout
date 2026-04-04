import { getDb } from '../db/index.js';
import type { ReceiptItemRow, ReceiptRow, UserId } from '../db/schema.types.js';

const RECEIPT_COLS = `id, user_id, store_id, purchase_date, total, image_url, created_at`;
const ITEM_COLS = `id, receipt_id, raw_text, canonical_product_id, free_text, quantity, price, confidence_score, created_at`;

export function insertReceipt(row: {
  user_id: UserId;
  store_id: number | null;
  purchase_date: string | null;
  total: number | null;
  image_url: string | null;
}): ReceiptRow {
  const r = getDb()
    .prepare(
      `INSERT INTO receipts (user_id, store_id, purchase_date, total, image_url)
       VALUES (?, ?, ?, ?, ?)
       RETURNING ${RECEIPT_COLS}`,
    )
    .get(
      row.user_id,
      row.store_id,
      row.purchase_date,
      row.total,
      row.image_url,
    ) as ReceiptRow | undefined;
  if (!r) {
    throw new Error('Failed to insert receipt');
  }
  return r;
}

export function insertReceiptItems(
  receiptId: number,
  items: {
    raw_text: string;
    canonical_product_id: number | null;
    free_text: string | null;
    quantity: string | null;
    price: number | null;
    confidence_score: number | null;
  }[],
): ReceiptItemRow[] {
  if (items.length === 0) {
    return [];
  }
  const stmt = getDb().prepare(
    `INSERT INTO receipt_items (receipt_id, raw_text, canonical_product_id, free_text, quantity, price, confidence_score)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING ${ITEM_COLS}`,
  );
  const out: ReceiptItemRow[] = [];
  for (const it of items) {
    const row = stmt.get(
      receiptId,
      it.raw_text,
      it.canonical_product_id,
      it.free_text,
      it.quantity,
      it.price,
      it.confidence_score,
    ) as ReceiptItemRow | undefined;
    if (row) {
      out.push(row);
    }
  }
  return out;
}

export function findReceiptByIdForUser(
  receiptId: number,
  userId: UserId,
): ReceiptRow | undefined {
  return getDb()
    .prepare(
      `SELECT ${RECEIPT_COLS} FROM receipts WHERE id = ? AND user_id = ?`,
    )
    .get(receiptId, userId) as ReceiptRow | undefined;
}

export function findReceiptItemsByReceiptId(receiptId: number): ReceiptItemRow[] {
  return getDb()
    .prepare(
      `SELECT ${ITEM_COLS} FROM receipt_items WHERE receipt_id = ? ORDER BY id ASC`,
    )
    .all(receiptId) as ReceiptItemRow[];
}

export function findReceiptItemByIdForReceipt(
  receiptItemId: number,
  receiptId: number,
): ReceiptItemRow | undefined {
  return getDb()
    .prepare(
      `SELECT ${ITEM_COLS} FROM receipt_items WHERE id = ? AND receipt_id = ?`,
    )
    .get(receiptItemId, receiptId) as ReceiptItemRow | undefined;
}
