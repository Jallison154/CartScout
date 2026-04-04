import type { ReceiptItemRow, ReceiptRow, UserId } from '../db/schema.types.js';
import { withTransaction } from '../db/transaction.js';
import * as listItemRepository from '../repositories/listItem.repository.js';
import * as listRepository from '../repositories/list.repository.js';
import * as receiptRepository from '../repositories/receipt.repository.js';
import * as storeProductPriceRepository from '../repositories/storeProductPrice.repository.js';
import * as storeRepository from '../repositories/store.repository.js';
import { HttpError } from '../utils/errors.js';
import { getMockReceiptLines } from './receiptOcr.stub.js';
import type { ReceiptConfirmBody } from '../validation/receiptConfirm.schema.js';
import * as listService from './list.service.js';
import * as productService from './product.service.js';

export type ReceiptPublic = {
  id: number;
  user_id: number;
  store_id: number | null;
  purchase_date: string | null;
  total: number | null;
  image_url: string | null;
  created_at: string;
};

export type ReceiptItemPublic = {
  id: number;
  receipt_id: number;
  raw_text: string;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  price: number | null;
  confidence_score: number | null;
  created_at: string;
};

function toReceiptPublic(row: ReceiptRow): ReceiptPublic {
  return {
    id: row.id,
    user_id: row.user_id,
    store_id: row.store_id,
    purchase_date: row.purchase_date,
    total: row.total,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

function toItemPublic(row: ReceiptItemRow): ReceiptItemPublic {
  return {
    id: row.id,
    receipt_id: row.receipt_id,
    raw_text: row.raw_text,
    canonical_product_id: row.canonical_product_id,
    free_text: row.free_text,
    quantity: row.quantity,
    price: row.price,
    confidence_score: row.confidence_score,
    created_at: row.created_at,
  };
}

export function parseReceiptUploadFields(body: Record<string, unknown>): {
  store_id: number | null;
  purchase_date: string | null;
  total: number | null;
} {
  const storeRaw = body.store_id;
  let store_id: number | null = null;
  if (storeRaw !== undefined && storeRaw !== null && String(storeRaw).trim() !== '') {
    const n = Number(storeRaw);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpError(400, 'Invalid store_id', 'VALIDATION_ERROR');
    }
    store_id = n;
  }

  const purchaseRaw = body.purchase_date;
  let purchase_date: string | null = null;
  if (purchaseRaw != null && String(purchaseRaw).trim() !== '') {
    const s = String(purchaseRaw).trim();
    if (s.length > 64) {
      throw new HttpError(400, 'purchase_date is too long', 'VALIDATION_ERROR');
    }
    purchase_date = s;
  }

  const totalRaw = body.total;
  let total: number | null = null;
  if (totalRaw !== undefined && totalRaw !== null && String(totalRaw).trim() !== '') {
    const n = Number(totalRaw);
    if (!Number.isFinite(n) || n < 0) {
      throw new HttpError(400, 'Invalid total', 'VALIDATION_ERROR');
    }
    total = n;
  }

  return { store_id, purchase_date, total };
}

/**
 * Persists receipt row + stub-parsed line items (transactional at DB layer).
 */
export function createReceiptFromUpload(args: {
  userId: UserId;
  relativeImageUrl: string | null;
  store_id: number | null;
  purchase_date: string | null;
  total: number | null;
}): { receipt: ReceiptPublic; items: ReceiptItemPublic[] } {
  if (args.store_id != null && !storeRepository.findStoreById(args.store_id)) {
    throw new HttpError(400, 'Unknown store', 'UNKNOWN_STORE');
  }

  return withTransaction(() => {
    const receiptRow = receiptRepository.insertReceipt({
      user_id: args.userId,
      store_id: args.store_id,
      purchase_date: args.purchase_date,
      total: args.total,
      image_url: args.relativeImageUrl,
    });

    const mockLines = getMockReceiptLines(receiptRow.id);
    const itemRows = receiptRepository.insertReceiptItems(receiptRow.id, mockLines);

    return {
      receipt: toReceiptPublic(receiptRow),
      items: itemRows.map(toItemPublic),
    };
  });
}

export function getReceiptDetailForUser(
  userId: UserId,
  receiptId: number,
): { receipt: ReceiptPublic; items: ReceiptItemPublic[] } {
  const receipt = receiptRepository.findReceiptByIdForUser(receiptId, userId);
  if (!receipt) {
    throw new HttpError(404, 'Receipt not found', 'NOT_FOUND');
  }
  const items = receiptRepository.findReceiptItemsByReceiptId(receiptId);
  return {
    receipt: toReceiptPublic(receipt),
    items: items.map(toItemPublic),
  };
}

export type ReceiptConfirmTarget = ReceiptConfirmBody['target'];
export type ReceiptConfirmLineInput = ReceiptConfirmBody['lines'][number];

function normalizeOptionalQuantity(q: string | null | undefined): string | null {
  if (q === undefined || q === null) {
    return null;
  }
  const t = q.trim();
  return t.length ? t : null;
}

function mergeFreeTextForUnmatched(
  line: ReceiptConfirmLineInput,
  item: ReceiptItemRow,
): string {
  const fromLine = line.free_text;
  if (fromLine !== undefined && fromLine !== null) {
    return fromLine.trim();
  }
  if (item.free_text != null && item.free_text.trim().length) {
    return item.free_text.trim();
  }
  return item.raw_text.trim();
}

function mergeFreeTextForMatched(
  line: ReceiptConfirmLineInput,
  item: ReceiptItemRow,
): string | null {
  const fromLine = line.free_text;
  if (fromLine !== undefined) {
    if (fromLine === null) {
      return null;
    }
    const t = fromLine.trim();
    return t.length ? t : null;
  }
  if (item.free_text != null && item.free_text.trim().length) {
    return item.free_text.trim();
  }
  return null;
}

/**
 * Applies reviewed receipt lines: creates or targets a list, inserts items (catalog or free-text),
 * and records receipt-sourced store prices for matched lines when the receipt has a store and a price.
 */
export function confirmReceiptForUser(
  userId: UserId,
  receiptId: number,
  body: ReceiptConfirmBody,
): { list: listService.ListPublic; items: listService.ListItemPublic[] } {
  const listId = withTransaction(() => {
    const receipt = receiptRepository.findReceiptByIdForUser(receiptId, userId);
    if (!receipt) {
      throw new HttpError(404, 'Receipt not found', 'NOT_FOUND');
    }

    let targetListId: number;
    if (body.target.mode === 'new_list') {
      const row = listRepository.insertList(userId, body.target.name, null, null);
      targetListId = row.id;
    } else {
      const list = listRepository.findListByIdForUser(body.target.list_id, userId);
      if (!list) {
        throw new HttpError(404, 'List not found', 'NOT_FOUND');
      }
      targetListId = list.id;
    }

    let added = 0;

    for (const line of body.lines) {
      if (!line.include) {
        continue;
      }

      const item = receiptRepository.findReceiptItemByIdForReceipt(
        line.receipt_item_id,
        receiptId,
      );
      if (!item) {
        throw new HttpError(
          400,
          'Receipt line does not belong to this receipt',
          'INVALID_RECEIPT_ITEM',
        );
      }

      const canonical =
        line.canonical_product_id !== undefined
          ? line.canonical_product_id
          : item.canonical_product_id;

      const quantity =
        line.quantity !== undefined
          ? normalizeOptionalQuantity(line.quantity)
          : normalizeOptionalQuantity(item.quantity);

      if (canonical != null) {
        productService.assertCanonicalProductExists(canonical);
        const freeText = mergeFreeTextForMatched(line, item);
        listItemRepository.insertItem(targetListId, {
          canonical_product_id: canonical,
          free_text: freeText,
          quantity,
          sort_order: listItemRepository.getNextSortOrder(targetListId),
        });
        added += 1;

        if (receipt.store_id != null) {
          const unitPrice =
            line.unit_price !== undefined && line.unit_price !== null
              ? line.unit_price
              : item.price;
          if (unitPrice != null && Number.isFinite(unitPrice) && unitPrice >= 0) {
            storeProductPriceRepository.upsertReceiptPriceSnapshot({
              store_id: receipt.store_id,
              canonical_product_id: canonical,
              price: unitPrice,
              confidence_score: item.confidence_score,
            });
          }
        }
      } else {
        const text = mergeFreeTextForUnmatched(line, item);
        if (!text.length) {
          throw new HttpError(
            400,
            'free_text is required for unmatched receipt lines',
            'VALIDATION_ERROR',
          );
        }
        listItemRepository.insertItem(targetListId, {
          canonical_product_id: null,
          free_text: text,
          quantity,
          sort_order: listItemRepository.getNextSortOrder(targetListId),
        });
        added += 1;
      }
    }

    if (added === 0) {
      throw new HttpError(
        400,
        'No lines were included; select at least one item to add',
        'NO_ITEMS_SELECTED',
      );
    }

    return targetListId;
  });

  return listService.getListDetailForUser(userId, listId);
}
