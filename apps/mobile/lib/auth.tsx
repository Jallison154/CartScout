/**
 * Auth context: token in SecureStore (native) or localStorage (web). Refresh on 401.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ApiClient } from "@cartscout/api-client";
import * as storage from "./storage";

const TOKEN_KEY = "cartscout_access_token";
const REFRESH_KEY = "cartscout_refresh_token";
const EXPIRY_KEY = "cartscout_expires_in";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "http://localhost:4000";
  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
};

let apiClient: ApiClient | null = null;

function getClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient({
      baseUrl: getBaseUrl(),
      getToken: async () => storage.getItemAsync(TOKEN_KEY),
      setTokens: async (access, refresh, expiresIn) => {
        await storage.setItemAsync(TOKEN_KEY, access);
        await storage.setItemAsync(REFRESH_KEY, refresh);
        await storage.setItemAsync(EXPIRY_KEY, String(expiresIn));
      },
      onUnauthorized: async () => {
        const refresh = await storage.getItemAsync(REFRESH_KEY);
        if (refresh) {
          const out = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          const json = await out.json();
          if (json.data?.accessToken) {
            await storage.setItemAsync(TOKEN_KEY, json.data.accessToken);
            if (json.data.refreshToken) await storage.setItemAsync(REFRESH_KEY, json.data.refreshToken);
          }
        }
      },
    });
  }
  return apiClient;
}

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ApiClient;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.getItemAsync(TOKEN_KEY).then((t) => {
      setToken(t);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const client = getClient();
    const res = await client.login(email, password);
    if (res.data?.accessToken) setToken(res.data.accessToken);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const client = getClient();
    const res = await client.register(email, password);
    if (res.data?.accessToken) setToken(res.data.accessToken);
  }, []);

  const logout = useCallback(async () => {
    await storage.deleteItemAsync(TOKEN_KEY);
    await storage.deleteItemAsync(REFRESH_KEY);
    await storage.deleteItemAsync(EXPIRY_KEY);
    setToken(null);
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
    api: getClient(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
