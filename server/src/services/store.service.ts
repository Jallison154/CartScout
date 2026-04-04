import * as storeRepository from '../repositories/store.repository.js';
import type { StoreRow, UserId } from '../db/schema.types.js';
import { HttpError } from '../utils/errors.js';

export type StorePublic = {
  id: number;
  name: string;
  chain: string | null;
  source: string | null;
  created_at: string;
};

function toStorePublic(row: StoreRow): StorePublic {
  return {
    id: row.id,
    name: row.name,
    chain: row.chain,
    source: row.source,
    created_at: row.created_at,
  };
}

export function listStores(): { stores: StorePublic[] } {
  const rows = storeRepository.listAllStores();
  return { stores: rows.map(toStorePublic) };
}

export function listFavoriteStores(userId: UserId): { stores: StorePublic[] } {
  const rows = storeRepository.listFavoriteStoresForUser(userId);
  return { stores: rows.map(toStorePublic) };
}

export function addFavoriteStore(userId: UserId, storeId: number): { store: StorePublic } {
  const store = storeRepository.findStoreById(storeId);
  if (!store) {
    throw new HttpError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  storeRepository.insertUserFavoriteStore(userId, storeId);
  return { store: toStorePublic(store) };
}

export function removeFavoriteStore(userId: UserId, storeId: number): void {
  const removed = storeRepository.deleteUserFavoriteStore(userId, storeId);
  if (removed === 0) {
    throw new HttpError(404, 'Favorite not found', 'FAVORITE_NOT_FOUND');
  }
}
