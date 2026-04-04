import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '@/api/auth';
import { getAccessToken } from '@/lib/storage';
import type { AuthUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const { user: u } = await authApi.fetchMe();
      setUser(u);
    } catch {
      authApi.logout();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authApi.register(email, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth outside AuthProvider');
  }
  return ctx;
}
