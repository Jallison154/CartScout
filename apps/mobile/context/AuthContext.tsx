import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as authApi from '@/api/auth';
import { getApiBaseUrl } from '@/api/config';
import * as tokenStorage from '@/services/tokenStorage';
import { setSessionInvalidateHandler } from '@/services/sessionBridge';
import type { AuthUser } from '@/types/auth';

void SplashScreen.preventAutoHideAsync();

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

async function persistSession(payload: Awaited<ReturnType<typeof authApi.loginRequest>>) {
  await tokenStorage.saveTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      if (!getApiBaseUrl()) {
        setUser(null);
        return;
      }

      let access = await tokenStorage.getAccessToken();
      const refresh = await tokenStorage.getRefreshToken();

      if (access) {
        try {
          const me = await authApi.meRequest(access);
          setUser(me.user);
          return;
        } catch {
          /* expired or unreachable — try refresh */
        }
      }

      if (refresh) {
        try {
          const next = await authApi.refreshRequest(refresh);
          await persistSession(next);
          setUser(next.user);
          return;
        } catch {
          await tokenStorage.clearTokens();
        }
      }

      setUser(null);
    } finally {
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setSessionInvalidateHandler(() => {
      setUser(null);
      router.replace('/');
    });
    return () => setSessionInvalidateHandler(null);
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const result = await authApi.loginRequest(trimmedEmail, password);
    await persistSession(result);
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const result = await authApi.registerRequest(trimmedEmail, password);
    await persistSession(result);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await tokenStorage.clearTokens();
    setUser(null);
    router.replace('/');
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isReady,
      signIn,
      signUp,
      signOut,
    }),
    [user, isReady, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
