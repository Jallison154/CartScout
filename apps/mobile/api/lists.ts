import { authDelete, authGetJson, authPatchJson, authPostJson } from '@/api/authorized';
import type { ListOptimizationResult } from '@/types/listOptimization';
import type { GroceryList, ListItem } from '@/types/lists';

type Data<T> = { data: T };

export async function fetchLists(): Promise<GroceryList[]> {
  const res = await authGetJson<Data<{ lists: GroceryList[] }>>('/api/v1/lists');
  return res.data.lists;
}

export async function createList(name: string): Promise<GroceryList> {
  const res = await authPostJson<Data<{ list: GroceryList }>, { name: string }>(
    '/api/v1/lists',
    { name },
  );
  return res.data.list;
}

export async function fetchListDetail(listId: number): Promise<{
  list: GroceryList;
  items: ListItem[];
}> {
  const res = await authGetJson<Data<{ list: GroceryList; items: ListItem[] }>>(
    `/api/v1/lists/${listId}`,
  );
  return res.data;
}

export async function fetchListOptimization(
  listId: number,
): Promise<ListOptimizationResult> {
  const res = await authGetJson<Data<ListOptimizationResult>>(
    `/api/v1/lists/${listId}/optimize`,
  );
  return res.data;
}

export async function createListItem(
  listId: number,
  body: {
    free_text?: string;
    canonical_product_id?: number;
    quantity?: string | null;
  },
): Promise<ListItem> {
  const payload: Record<string, unknown> = {};
  if (body.free_text !== undefined && body.free_text.trim().length > 0) {
    payload.free_text = body.free_text.trim();
  }
  if (body.canonical_product_id !== undefined) {
    payload.canonical_product_id = body.canonical_product_id;
  }
  if (body.quantity !== undefined) {
    payload.quantity = body.quantity;
  }
  const res = await authPostJson<Data<{ item: ListItem }>, Record<string, unknown>>(
    `/api/v1/lists/${listId}/items`,
    payload,
  );
  return res.data.item;
}

export async function patchListItem(
  listId: number,
  itemId: number,
  patch: Record<string, unknown>,
): Promise<ListItem> {
  const res = await authPatchJson<Data<{ item: ListItem }>, Record<string, unknown>>(
    `/api/v1/lists/${listId}/items/${itemId}`,
    patch,
  );
  return res.data.item;
}

export async function deleteListItem(listId: number, itemId: number): Promise<void> {
  await authDelete(`/api/v1/lists/${listId}/items/${itemId}`);
}
