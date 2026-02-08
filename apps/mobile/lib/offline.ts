/**
 * Offline support: cache lists/items locally and queue mutations when offline.
 * Uses AsyncStorage for cache; sync when back online.
 * Phase 1: detect offline and show message; Phase 2: queue + sync (see TODOS).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "cartscout_cache_";
const QUEUE_KEY = "cartscout_offline_queue";

export async function getCachedLists(): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + "lists");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedLists(lists: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + "lists", JSON.stringify(lists));
  } catch {
    // ignore
  }
}

export async function enqueueMutation(mutation: { type: string; payload: unknown }): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...mutation, ts: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export async function getOfflineQueue(): Promise<Array<{ type: string; payload: unknown; ts: number }>> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}
