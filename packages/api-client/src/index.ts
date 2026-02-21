/**
 * API client for CartScout. Use from mobile (Expo) or web.
 * Caller provides getToken/setToken so mobile can use SecureStore.
 */

import type { ApiErrorBody, ApiResponse, AuthLoginResponse, AuthRefreshResponse } from "@cartscout/types";

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  setTokens?: (access: string, refresh: string, expiresIn: number) => Promise<void>;
  onUnauthorized?: () => Promise<void>;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;
  private setTokens?: (access: string, refresh: string, expiresIn: number) => Promise<void>;
  private onUnauthorized?: () => Promise<void>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
    this.setTokens = config.setTokens;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(
    path: string,
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const { skipAuth, ...init } = options;
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) || {}),
    };
    if (!skipAuth) {
      const token = await this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(url, { ...init, headers });

    if (res.status === 401 && this.setTokens && this.onUnauthorized) {
      await this.onUnauthorized();
      const token = await this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        res = await fetch(url, { ...init, headers });
      }
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = json as ApiErrorBody;
      throw new Error(err?.error?.message || res.statusText || "Request failed");
    }
    return json as ApiResponse<T>;
  }

  async post<T>(path: string, body: unknown, skipAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body), skipAuth });
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<T>(path + qs, { method: "GET" });
  }

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  async delete<T = void>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }

  /** Auth: login. Returns { data: AuthLoginResponse } */
  async login(email: string, password: string) {
    const out = await this.post<AuthLoginResponse>("/api/v1/auth/login", { email, password }, true);
    if (this.setTokens && out.data)
      await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
    return out;
  }

  /** Auth: register. Returns { data: AuthLoginResponse } */
  async register(email: string, password: string) {
    const out = await this.post<AuthLoginResponse>("/api/v1/auth/register", { email, password }, true);
    if (this.setTokens && out.data)
      await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
    return out;
  }

  /** Auth: refresh (call from onUnauthorized to get new access token). Returns { data: AuthRefreshResponse } */
  async refresh(refreshToken: string) {
    const out = await this.post<AuthRefreshResponse>("/api/v1/auth/refresh", { refreshToken }, true);
    if (this.setTokens && out.data)
      await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
    return out;
  }

  /** GET /api/v1/lists */
  lists(includeItems?: boolean) {
    return this.get<import("@cartscout/types").List[]>(
      "/api/v1/lists",
      includeItems ? { include: "items" } : undefined
    );
  }

  /** GET /api/v1/lists/:id */
  list(id: string, includeItems?: boolean) {
    return this.get<import("@cartscout/types").List>(
      `/api/v1/lists/${id}`,
      includeItems ? { include: "items" } : undefined
    );
  }

  /** POST /api/v1/lists */
  createList(body: { name?: string; list_type?: string; week_start?: string }) {
    return this.post<import("@cartscout/types").List>("/api/v1/lists", body);
  }

  /** PATCH /api/v1/lists/:id */
  updateList(id: string, body: { name?: string; list_type?: string; week_start?: string }) {
    return this.patch<import("@cartscout/types").List>(`/api/v1/lists/${id}`, body);
  }

  /** DELETE /api/v1/lists/:id */
  deleteList(id: string) {
    return this.delete(`/api/v1/lists/${id}`);
  }

  /** POST /api/v1/lists/:id/items */
  addListItem(listId: string, body: { canonical_product_id?: string; free_text?: string; quantity?: number }) {
    return this.post<import("@cartscout/types").ListItem>(`/api/v1/lists/${listId}/items`, body);
  }

  /** PATCH /api/v1/lists/:id/items/:itemId */
  updateListItem(listId: string, itemId: string, body: { quantity?: number; checked?: boolean }) {
    return this.patch<import("@cartscout/types").ListItem>(`/api/v1/lists/${listId}/items/${itemId}`, body);
  }

  /** DELETE /api/v1/lists/:id/items/:itemId */
  deleteListItem(listId: string, itemId: string) {
    return this.delete(`/api/v1/lists/${listId}/items/${itemId}`);
  }

  /** GET /api/v1/lists/:id/stores - store ids for this list */
  listStores(listId: string) {
    return this.get<string[]>(`/api/v1/lists/${listId}/stores`);
  }

  /** PUT /api/v1/lists/:id/stores - set stores for this list */
  setListStores(listId: string, storeIds: string[]) {
    return this.put<string[]>(`/api/v1/lists/${listId}/stores`, { store_ids: storeIds });
  }

  /** GET /api/v1/stores - list all stores */
  stores() {
    return this.get<import("@cartscout/types").Store[]>("/api/v1/stores");
  }

  /** GET /api/v1/stores/favorites - list user's selected store ids */
  storeFavorites() {
    return this.get<string[]>("/api/v1/stores/favorites");
  }

  /** POST /api/v1/stores/favorites - add store to favorites */
  addStoreFavorite(storeId: string) {
    return this.post<string[]>("/api/v1/stores/favorites", { store_id: storeId });
  }

  /** DELETE /api/v1/stores/favorites/:storeId - returns updated list of favorite store ids */
  removeStoreFavorite(storeId: string) {
    return this.delete<string[]>(`/api/v1/stores/favorites/${storeId}`);
  }

  /** GET /api/v1/products/search?q= - product suggestions */
  searchProducts(q: string, limit = 15) {
    return this.get<import("@cartscout/types").CanonicalProduct[]>("/api/v1/products/search", { q, limit: String(limit) });
  }
}
