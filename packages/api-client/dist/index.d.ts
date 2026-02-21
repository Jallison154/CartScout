/**
 * API client for CartScout. Use from mobile (Expo) or web.
 * Caller provides getToken/setToken so mobile can use SecureStore.
 */
import type { ApiResponse, AuthLoginResponse, AuthRefreshResponse } from "@cartscout/types";
export interface ApiClientConfig {
    baseUrl: string;
    getToken: () => Promise<string | null>;
    setTokens?: (access: string, refresh: string, expiresIn: number) => Promise<void>;
    onUnauthorized?: () => Promise<void>;
}
export declare class ApiClient {
    private baseUrl;
    private getToken;
    private setTokens?;
    private onUnauthorized?;
    constructor(config: ApiClientConfig);
    private request;
    post<T>(path: string, body: unknown, skipAuth?: boolean): Promise<ApiResponse<T>>;
    get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
    patch<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
    put<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
    delete<T = void>(path: string): Promise<ApiResponse<T>>;
    /** Auth: login. Returns { data: AuthLoginResponse } */
    login(email: string, password: string): Promise<ApiResponse<AuthLoginResponse>>;
    /** Auth: register. Returns { data: AuthLoginResponse } */
    register(email: string, password: string): Promise<ApiResponse<AuthLoginResponse>>;
    /** Auth: refresh (call from onUnauthorized to get new access token). Returns { data: AuthRefreshResponse } */
    refresh(refreshToken: string): Promise<ApiResponse<AuthRefreshResponse>>;
    /** GET /api/v1/lists */
    lists(includeItems?: boolean): Promise<ApiResponse<import("@cartscout/types").List[]>>;
    /** GET /api/v1/lists/:id */
    list(id: string, includeItems?: boolean): Promise<ApiResponse<import("@cartscout/types").List>>;
    /** POST /api/v1/lists */
    createList(body: {
        name?: string;
        list_type?: string;
        week_start?: string;
    }): Promise<ApiResponse<import("@cartscout/types").List>>;
    /** PATCH /api/v1/lists/:id */
    updateList(id: string, body: {
        name?: string;
        list_type?: string;
        week_start?: string;
    }): Promise<ApiResponse<import("@cartscout/types").List>>;
    /** DELETE /api/v1/lists/:id */
    deleteList(id: string): Promise<ApiResponse<void>>;
    /** POST /api/v1/lists/:id/items */
    addListItem(listId: string, body: {
        canonical_product_id?: string;
        free_text?: string;
        quantity?: number;
    }): Promise<ApiResponse<import("@cartscout/types").ListItem>>;
    /** PATCH /api/v1/lists/:id/items/:itemId */
    updateListItem(listId: string, itemId: string, body: {
        quantity?: number;
        checked?: boolean;
    }): Promise<ApiResponse<import("@cartscout/types").ListItem>>;
    /** DELETE /api/v1/lists/:id/items/:itemId */
    deleteListItem(listId: string, itemId: string): Promise<ApiResponse<void>>;
    /** GET /api/v1/lists/:id/stores - store ids for this list */
    listStores(listId: string): Promise<ApiResponse<string[]>>;
    /** PUT /api/v1/lists/:id/stores - set stores for this list */
    setListStores(listId: string, storeIds: string[]): Promise<ApiResponse<string[]>>;
    /** GET /api/v1/stores - list all stores */
    stores(): Promise<ApiResponse<import("@cartscout/types").Store[]>>;
    /** GET /api/v1/stores/favorites - list user's selected store ids */
    storeFavorites(): Promise<ApiResponse<string[]>>;
    /** POST /api/v1/stores/favorites - add store to favorites */
    addStoreFavorite(storeId: string): Promise<ApiResponse<string[]>>;
    /** DELETE /api/v1/stores/favorites/:storeId - returns updated list of favorite store ids */
    removeStoreFavorite(storeId: string): Promise<ApiResponse<string[]>>;
    /** GET /api/v1/products/search?q= - product suggestions */
    searchProducts(q: string, limit?: number): Promise<ApiResponse<import("@cartscout/types").CanonicalProduct[]>>;
}
