import { apiGetJson, apiPostJson } from '@/api/http';
import type { AuthSuccess } from '@/types/auth';

type Data<T> = { data: T };

export async function loginRequest(email: string, password: string): Promise<AuthSuccess> {
  const res = await apiPostJson<Data<AuthSuccess>, { email: string; password: string }>(
    '/api/v1/auth/login',
    { email, password },
  );
  return res.data;
}

export async function registerRequest(email: string, password: string): Promise<AuthSuccess> {
  const res = await apiPostJson<Data<AuthSuccess>, { email: string; password: string }>(
    '/api/v1/auth/register',
    { email, password },
  );
  return res.data;
}

export async function refreshRequest(refreshToken: string): Promise<AuthSuccess> {
  const res = await apiPostJson<Data<AuthSuccess>, { refreshToken: string }>(
    '/api/v1/auth/refresh',
    { refreshToken },
  );
  return res.data;
}

export async function meRequest(accessToken: string): Promise<{ user: AuthSuccess['user'] }> {
  const res = await apiGetJson<Data<{ user: AuthSuccess['user'] }>>('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}
