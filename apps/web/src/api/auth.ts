import { authJson, publicJson } from '@/api/client';
import { clearTokens, setTokens } from '@/lib/storage';
import type { AuthSuccess } from '@/types/auth';

type Data<T> = { data: T };

export async function login(email: string, password: string): Promise<AuthSuccess> {
  const res = await publicJson<Data<AuthSuccess>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data;
}

export async function register(email: string, password: string): Promise<AuthSuccess> {
  const res = await publicJson<Data<AuthSuccess>>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data;
}

export async function fetchMe(): Promise<{ user: AuthSuccess['user'] }> {
  const res = await authJson<Data<{ user: AuthSuccess['user'] }>>('/api/v1/auth/me');
  return res.data;
}

export function logout(): void {
  clearTokens();
}
