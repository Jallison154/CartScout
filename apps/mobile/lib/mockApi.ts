/**
 * Mock API client for UI development without a server.
 * Enable with EXPO_PUBLIC_USE_MOCK_API=true (e.g. in .env or app config).
 *
 * - Login/register accept any email/password and return a fake token.
 * - Lists and items are kept in memory for the session (create/add/update/delete work).
 * - Stores and product search use static fixtures.
 * - Favorites are in-memory (toggle works until refresh).
 */

import type { ApiResponse } from "@cartscout/types";
import type { List, ListItem, Store, CanonicalProduct } from "@cartscout/types";
import { DEFAULT_STORES } from "../constants/stores";

const delay = (ms = 50) => new Promise((r) => setTimeout(r, ms));

const MOCK_PRODUCTS: CanonicalProduct[] = [
  { id: "prod-milk-1", display_name: "Whole Milk 1 Gallon", brand: "Generic", source: "seed" },
  { id: "prod-bread-1", display_name: "White Bread", brand: "Generic", source: "seed" },
  { id: "prod-eggs-1", display_name: "Large Eggs 12ct", brand: "Generic", source: "seed" },
  { id: "prod-banana-1", display_name: "Bananas", brand: "Generic", source: "seed" },
  { id: "prod-apple-1", display_name: "Gala Apples", brand: "Generic", source: "seed" },
  { id: "prod-cheese-1", display_name: "Cheddar Cheese Block", brand: "Generic", source: "seed" },
  { id: "prod-yogurt-1", display_name: "Plain Yogurt", brand: "Generic", source: "seed" },
  { id: "prod-butter-1", display_name: "Butter 1 lb", brand: "Generic", source: "seed" },
];

function fakeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** In-memory state for the mock (persists for the session only). */
const state = {
  lists: [] as List[],
  listItems: [] as (ListItem & { list_id: string })[],
  favoriteStoreIds: [] as string[],
  listStores: {} as Record<string, string[]>,
};

function listWithItems(list: List): List {
  const items = state.listItems
    .filter((i) => i.list_id === list.id)
    .map(({ list_id: _lid, ...item }) => item)
    .sort((a, b) => a.sort_order - b.sort_order);
  return { ...list, items };
}

/**
 * Mock client that matches the ApiClient interface used by the app.
 * Use when EXPO_PUBLIC_USE_MOCK_API is set so you can develop UI without the server.
 */
export class MockApiClient {
  private setTokens?: (access: string, refresh: string, expiresIn: number) => Promise<void>;

  constructor(config?: { setTokens?: (access: string, refresh: string, expiresIn: number) => Promise<void> }) {
    this.setTokens = config?.setTokens;
  }

  async login(email: string, _password: string): Promise<ApiResponse<{ user: { id: string; email: string }; accessToken: string; refreshToken: string; expiresIn: number }>> {
    await delay();
    const data = {
      user: { id: "mock-user-1", email: email.trim() || "mock@example.com" },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresIn: 3600,
    };
    if (this.setTokens) await this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return { data };
  }

  async register(email: string, password: string) {
    return this.login(email, password);
  }

  async refresh(_refreshToken: string) {
    await delay();
    const data = { accessToken: "mock-access-token", refreshToken: "mock-refresh-token", expiresIn: 3600 };
    if (this.setTokens) await this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return { data };
  }

  async lists(includeItems?: boolean): Promise<ApiResponse<List[]>> {
    await delay();
    const raw = includeItems ? state.lists.map(listWithItems) : [...state.lists];
    const seen = new Set<string>();
    const lists = raw.filter((l) => l?.id && !seen.has(l.id) && (seen.add(l.id), true));
    return { data: lists };
  }

  async list(id: string, includeItems?: boolean): Promise<ApiResponse<List>> {
    await delay();
    const list = state.lists.find((l) => l.id === id);
    if (!list) throw new Error("List not found");
    const out = includeItems ? listWithItems(list) : list;
    return { data: out };
  }

  async createList(body: { name?: string; list_type?: string; week_start?: string }): Promise<ApiResponse<List>> {
    await delay();
    const id = fakeId("list");
    const now = new Date().toISOString();
    const list: List = {
      id,
      name: (body.name && body.name.trim()) || "New list",
      list_type: body.list_type === "current_week" || body.list_type === "next_order" ? body.list_type : "custom",
      week_start: body.week_start || null,
      created_at: now,
      updated_at: now,
    };
    state.lists.unshift(list);
    return { data: list };
  }

  async updateList(id: string, body: { name?: string; list_type?: string; week_start?: string }): Promise<ApiResponse<List>> {
    await delay();
    const list = state.lists.find((l) => l.id === id);
    if (!list) throw new Error("List not found");
    if (body.name !== undefined) list.name = body.name.trim();
    if (body.list_type !== undefined) list.list_type = body.list_type as List["list_type"];
    if (body.week_start !== undefined) list.week_start = body.week_start || null;
    list.updated_at = new Date().toISOString();
    return { data: list };
  }

  async deleteList(id: string): Promise<ApiResponse<void>> {
    await delay();
    state.lists = state.lists.filter((l) => l.id !== id);
    state.listItems = state.listItems.filter((i) => i.list_id !== id);
    delete state.listStores[id];
    return { data: undefined as unknown as void };
  }

  async listStores(listId: string): Promise<ApiResponse<string[]>> {
    await delay();
    const list = state.lists.find((l) => l.id === listId);
    if (!list) throw new Error("List not found");
    return { data: state.listStores[listId] ? [...state.listStores[listId]] : [] };
  }

  async setListStores(listId: string, storeIds: string[]): Promise<ApiResponse<string[]>> {
    await delay();
    const list = state.lists.find((l) => l.id === listId);
    if (!list) throw new Error("List not found");
    state.listStores[listId] = [...storeIds];
    return { data: [...state.listStores[listId]] };
  }

  async addListItem(
    listId: string,
    body: { canonical_product_id?: string; free_text?: string; quantity?: number }
  ): Promise<ApiResponse<ListItem>> {
    await delay();
    const list = state.lists.find((l) => l.id === listId);
    if (!list) throw new Error("List not found");
    const productId = body.canonical_product_id || null;
    const freeText = typeof body.free_text === "string" ? body.free_text.trim() || null : null;
    if (!productId && !freeText) throw new Error("Provide canonical_product_id or free_text");

    const product = productId ? MOCK_PRODUCTS.find((p) => p.id === productId) : null;
    const itemId = fakeId("item");
    const now = new Date().toISOString();
    const sortOrder = state.listItems.filter((i) => i.list_id === listId).length;
    const newItem: ListItem & { list_id: string } = {
      id: itemId,
      list_id: listId,
      canonical_product_id: productId,
      free_text: freeText,
      quantity: typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1,
      sort_order: sortOrder,
      checked: 0,
      created_at: now,
      display_name: product?.display_name ?? freeText,
      brand: product?.brand ?? null,
    };
    state.listItems.push(newItem);
    list.updated_at = now;
    const { list_id: _lid, ...out } = newItem;
    return { data: out };
  }

  async updateListItem(listId: string, itemId: string, body: { quantity?: number; checked?: boolean }): Promise<ApiResponse<ListItem>> {
    await delay();
    const item = state.listItems.find((i) => i.id === itemId && i.list_id === listId);
    if (!item) throw new Error("Item not found");
    if (typeof body.quantity === "number" && body.quantity > 0) item.quantity = body.quantity;
    if (typeof body.checked === "boolean") item.checked = body.checked ? 1 : 0;
    const list = state.lists.find((l) => l.id === listId);
    if (list) list.updated_at = new Date().toISOString();
    const { list_id: _lid, ...out } = item;
    return { data: out };
  }

  async deleteListItem(listId: string, itemId: string): Promise<ApiResponse<void>> {
    await delay();
    const idx = state.listItems.findIndex((i) => i.id === itemId && i.list_id === listId);
    if (idx === -1) throw new Error("Item not found");
    state.listItems.splice(idx, 1);
    const list = state.lists.find((l) => l.id === listId);
    if (list) list.updated_at = new Date().toISOString();
    return { data: undefined as unknown as void };
  }

  async stores(): Promise<ApiResponse<Store[]>> {
    await delay();
    return { data: DEFAULT_STORES };
  }

  async storeFavorites(): Promise<ApiResponse<string[]>> {
    await delay();
    return { data: [...state.favoriteStoreIds] };
  }

  async addStoreFavorite(storeId: string): Promise<ApiResponse<string[]>> {
    await delay();
    if (!state.favoriteStoreIds.includes(storeId)) state.favoriteStoreIds.push(storeId);
    return { data: [...state.favoriteStoreIds] };
  }

  async removeStoreFavorite(storeId: string): Promise<ApiResponse<string[]>> {
    await delay();
    state.favoriteStoreIds = state.favoriteStoreIds.filter((id) => id !== storeId);
    return { data: [...state.favoriteStoreIds] };
  }

  async searchProducts(q: string, limit = 15): Promise<ApiResponse<CanonicalProduct[]>> {
    await delay();
    const lower = q.trim().toLowerCase();
    if (!lower) return { data: [] };
    const filtered = MOCK_PRODUCTS.filter(
      (p) => p.display_name.toLowerCase().includes(lower) || (p.brand && p.brand.toLowerCase().includes(lower))
    ).slice(0, limit);
    return { data: filtered };
  }
}

export function useMockApi(): boolean {
  return process.env.EXPO_PUBLIC_USE_MOCK_API === "true" || process.env.EXPO_PUBLIC_USE_MOCK_API === "1";
}
