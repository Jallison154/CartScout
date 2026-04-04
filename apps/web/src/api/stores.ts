import { authFetch, authJson } from '@/api/client';
import { parseJsonResponse } from '@/api/errors';
import type { Store } from '@/types/stores';

type Data<T> = { data: T };

export async function fetchStores(): Promise<Store[]> {
  const res = await authJson<Data<{ stores: Store[] }>>('/api/v1/stores');
  return res.data.stores;
}

export async function fetchFavoriteStores(): Promise<Store[]> {
  const res = await authJson<Data<{ stores: Store[] }>>('/api/v1/stores/favorites');
  return res.data.stores;
}

export async function addFavoriteStore(storeId: number): Promise<Store> {
  const res = await authJson<Data<{ store: Store }>>('/api/v1/stores/favorites', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId }),
  });
  return res.data.store;
}

export async function removeFavoriteStore(storeId: number): Promise<void> {
  const res = await authFetch(`/api/v1/stores/favorites/${storeId}`, { method: 'DELETE' });
  if (res.status === 204) {
    return;
  }
  await parseJsonResponse(res);
}
