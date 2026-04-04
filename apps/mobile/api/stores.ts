import { authDelete, authGetJson, authPostJson } from '@/api/authorized';
import type { Store } from '@/types/stores';

type Data<T> = { data: T };

export async function fetchStores(): Promise<Store[]> {
  const res = await authGetJson<Data<{ stores: Store[] }>>('/api/v1/stores');
  return res.data.stores;
}

export async function fetchFavoriteStores(): Promise<Store[]> {
  const res = await authGetJson<Data<{ stores: Store[] }>>('/api/v1/stores/favorites');
  return res.data.stores;
}

export async function addFavoriteStore(storeId: number): Promise<Store> {
  const res = await authPostJson<Data<{ store: Store }>, { store_id: number }>(
    '/api/v1/stores/favorites',
    { store_id: storeId },
  );
  return res.data.store;
}

export async function removeFavoriteStore(storeId: number): Promise<void> {
  await authDelete(`/api/v1/stores/favorites/${storeId}`);
}
