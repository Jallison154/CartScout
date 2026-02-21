"use strict";
/**
 * API client for CartScout. Use from mobile (Expo) or web.
 * Caller provides getToken/setToken so mobile can use SecureStore.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
class ApiClient {
    baseUrl;
    getToken;
    setTokens;
    onUnauthorized;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.getToken = config.getToken;
        this.setTokens = config.setTokens;
        this.onUnauthorized = config.onUnauthorized;
    }
    async request(path, options = {}) {
        const { skipAuth, ...init } = options;
        const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
        const headers = {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        };
        if (!skipAuth) {
            const token = await this.getToken();
            if (token)
                headers["Authorization"] = `Bearer ${token}`;
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
            const err = json;
            throw new Error(err?.error?.message || res.statusText || "Request failed");
        }
        return json;
    }
    async post(path, body, skipAuth = false) {
        return this.request(path, { method: "POST", body: JSON.stringify(body), skipAuth });
    }
    async get(path, params) {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return this.request(path + qs, { method: "GET" });
    }
    async patch(path, body) {
        return this.request(path, { method: "PATCH", body: JSON.stringify(body) });
    }
    async put(path, body) {
        return this.request(path, { method: "PUT", body: JSON.stringify(body) });
    }
    async delete(path) {
        return this.request(path, { method: "DELETE" });
    }
    /** Auth: login. Returns { data: AuthLoginResponse } */
    async login(email, password) {
        const out = await this.post("/api/v1/auth/login", { email, password }, true);
        if (this.setTokens && out.data)
            await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
        return out;
    }
    /** Auth: register. Returns { data: AuthLoginResponse } */
    async register(email, password) {
        const out = await this.post("/api/v1/auth/register", { email, password }, true);
        if (this.setTokens && out.data)
            await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
        return out;
    }
    /** Auth: refresh (call from onUnauthorized to get new access token). Returns { data: AuthRefreshResponse } */
    async refresh(refreshToken) {
        const out = await this.post("/api/v1/auth/refresh", { refreshToken }, true);
        if (this.setTokens && out.data)
            await this.setTokens(out.data.accessToken, out.data.refreshToken, out.data.expiresIn);
        return out;
    }
    /** GET /api/v1/lists */
    lists(includeItems) {
        return this.get("/api/v1/lists", includeItems ? { include: "items" } : undefined);
    }
    /** GET /api/v1/lists/:id */
    list(id, includeItems) {
        return this.get(`/api/v1/lists/${id}`, includeItems ? { include: "items" } : undefined);
    }
    /** POST /api/v1/lists */
    createList(body) {
        return this.post("/api/v1/lists", body);
    }
    /** PATCH /api/v1/lists/:id */
    updateList(id, body) {
        return this.patch(`/api/v1/lists/${id}`, body);
    }
    /** DELETE /api/v1/lists/:id */
    deleteList(id) {
        return this.delete(`/api/v1/lists/${id}`);
    }
    /** POST /api/v1/lists/:id/items */
    addListItem(listId, body) {
        return this.post(`/api/v1/lists/${listId}/items`, body);
    }
    /** PATCH /api/v1/lists/:id/items/:itemId */
    updateListItem(listId, itemId, body) {
        return this.patch(`/api/v1/lists/${listId}/items/${itemId}`, body);
    }
    /** DELETE /api/v1/lists/:id/items/:itemId */
    deleteListItem(listId, itemId) {
        return this.delete(`/api/v1/lists/${listId}/items/${itemId}`);
    }
    /** GET /api/v1/lists/:id/stores - store ids for this list */
    listStores(listId) {
        return this.get(`/api/v1/lists/${listId}/stores`);
    }
    /** PUT /api/v1/lists/:id/stores - set stores for this list */
    setListStores(listId, storeIds) {
        return this.put(`/api/v1/lists/${listId}/stores`, { store_ids: storeIds });
    }
    /** GET /api/v1/stores - list all stores */
    stores() {
        return this.get("/api/v1/stores");
    }
    /** GET /api/v1/stores/favorites - list user's selected store ids */
    storeFavorites() {
        return this.get("/api/v1/stores/favorites");
    }
    /** POST /api/v1/stores/favorites - add store to favorites */
    addStoreFavorite(storeId) {
        return this.post("/api/v1/stores/favorites", { store_id: storeId });
    }
    /** DELETE /api/v1/stores/favorites/:storeId - returns updated list of favorite store ids */
    removeStoreFavorite(storeId) {
        return this.delete(`/api/v1/stores/favorites/${storeId}`);
    }
    /** GET /api/v1/products/search?q= - product suggestions */
    searchProducts(q, limit = 15) {
        return this.get("/api/v1/products/search", { q, limit: String(limit) });
    }
}
exports.ApiClient = ApiClient;
