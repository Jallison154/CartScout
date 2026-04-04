import * as listItemRepository from '../repositories/listItem.repository.js';
import * as listRepository from '../repositories/list.repository.js';
import type { ListItemRow, ListRow } from '../db/schema.types.js';
import type { UserId } from '../db/schema.types.js';
import { HttpError } from '../utils/errors.js';
import * as productService from './product.service.js';
import type { ProductPublic } from './product.service.js';

function assertListOwned(listId: number, userId: UserId): ListRow {
  const list = listRepository.findListByIdForUser(listId, userId);
  if (!list) {
    throw new HttpError(404, 'List not found', 'NOT_FOUND');
  }
  return list;
}

export type ListPublic = {
  id: number;
  name: string;
  list_type: string | null;
  week_start: string | null;
  created_at: string;
  updated_at: string;
};

export type ListItemPublic = {
  id: number;
  list_id: number;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  checked: boolean;
  sort_order: number | null;
  created_at: string;
  /** Present when `canonical_product_id` is set and the product exists in the catalog. */
  product: ProductPublic | null;
};

function toListPublic(row: ListRow): ListPublic {
  return {
    id: row.id,
    name: row.name,
    list_type: row.list_type,
    week_start: row.week_start,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toItemPublic(row: ListItemRow, products: Map<number, ProductPublic>): ListItemPublic {
  const product =
    row.canonical_product_id != null
      ? products.get(row.canonical_product_id) ?? null
      : null;
  return {
    id: row.id,
    list_id: row.list_id,
    canonical_product_id: row.canonical_product_id,
    free_text: row.free_text,
    quantity: row.quantity,
    checked: row.checked === 1,
    sort_order: row.sort_order,
    created_at: row.created_at,
    product,
  };
}

function productMapForItems(rows: ListItemRow[]): Map<number, ProductPublic> {
  const ids = rows
    .map((r) => r.canonical_product_id)
    .filter((id): id is number => id != null);
  return productService.mapProductsByIds(ids);
}

export function listListsForUser(userId: UserId): { lists: ListPublic[] } {
  const rows = listRepository.findListsByUserId(userId);
  return { lists: rows.map(toListPublic) };
}

export function createListForUser(
  userId: UserId,
  body: { name: string; list_type?: string | null; week_start?: string | null },
): { list: ListPublic } {
  const listType = body.list_type === undefined ? null : body.list_type;
  const weekStart = body.week_start === undefined ? null : body.week_start;
  const row = listRepository.insertList(userId, body.name, listType, weekStart);
  return { list: toListPublic(row) };
}

export function getListDetailForUser(
  userId: UserId,
  listId: number,
): { list: ListPublic; items: ListItemPublic[] } {
  const list = assertListOwned(listId, userId);
  const items = listItemRepository.findItemsByListId(listId);
  const products = productMapForItems(items);
  return { list: toListPublic(list), items: items.map((row) => toItemPublic(row, products)) };
}

export function updateListForUser(
  userId: UserId,
  listId: number,
  patch: { name?: string; list_type?: string | null; week_start?: string | null },
): { list: ListPublic } {
  const updated = listRepository.updateListForUser(listId, userId, patch);
  if (!updated) {
    throw new HttpError(404, 'List not found', 'NOT_FOUND');
  }
  return { list: toListPublic(updated) };
}

export function deleteListForUser(userId: UserId, listId: number): void {
  const deleted = listRepository.deleteListForUser(listId, userId);
  if (!deleted) {
    throw new HttpError(404, 'List not found', 'NOT_FOUND');
  }
}

export function addItemForUser(
  userId: UserId,
  listId: number,
  body: {
    free_text?: string | null;
    quantity?: string | null;
    sort_order?: number | null;
    canonical_product_id?: number | null;
  },
): { item: ListItemPublic } {
  assertListOwned(listId, userId);

  const hasText = body.free_text != null && body.free_text.trim().length > 0;
  const hasProduct = body.canonical_product_id != null;
  if (!hasText && !hasProduct) {
    throw new HttpError(
      400,
      'Provide free_text or canonical_product_id',
      'VALIDATION_ERROR',
    );
  }

  if (hasProduct) {
    productService.assertCanonicalProductExists(body.canonical_product_id!);
  }

  const freeText = hasText ? body.free_text!.trim() : null;
  const quantity = body.quantity === undefined ? null : body.quantity;
  let sortOrder: number | null;
  if (body.sort_order === undefined) {
    sortOrder = listItemRepository.getNextSortOrder(listId);
  } else {
    sortOrder = body.sort_order;
  }

  const row = listItemRepository.insertItem(listId, {
    free_text: freeText,
    quantity,
    sort_order: sortOrder,
    canonical_product_id: body.canonical_product_id ?? null,
  });

  const products = productMapForItems([row]);
  return { item: toItemPublic(row, products) };
}

export function updateItemForUser(
  userId: UserId,
  listId: number,
  itemId: number,
  patch: {
    free_text?: string | null;
    quantity?: string | null;
    checked?: boolean;
    sort_order?: number | null;
    canonical_product_id?: number | null;
  },
): { item: ListItemPublic } {
  assertListOwned(listId, userId);
  const existing = listItemRepository.findItemByIdForList(itemId, listId);
  if (!existing) {
    throw new HttpError(404, 'Item not found', 'NOT_FOUND');
  }

  if (patch.canonical_product_id !== undefined && patch.canonical_product_id !== null) {
    productService.assertCanonicalProductExists(patch.canonical_product_id);
  }

  const updated = listItemRepository.updateItemForList(itemId, listId, patch);
  if (!updated) {
    throw new HttpError(404, 'Item not found', 'NOT_FOUND');
  }
  const products = productMapForItems([updated]);
  return { item: toItemPublic(updated, products) };
}

export function deleteItemForUser(userId: UserId, listId: number, itemId: number): void {
  assertListOwned(listId, userId);
  const removed = listItemRepository.deleteItemForList(itemId, listId);
  if (!removed) {
    throw new HttpError(404, 'Item not found', 'NOT_FOUND');
  }
}
