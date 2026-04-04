import { getApiBaseUrl } from '@/api/config';
import { parseJsonResponse } from '@/api/errors';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/storage';
import type { AuthSuccess } from '@/types/auth';

type Data<T> = { data: T };

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('VITE_API_URL is not set');
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) {
    return false;
  }
  try {
    const res = await fetch(buildUrl('/api/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const body = await parseJsonResponse<Data<AuthSuccess>>(res);
    setTokens(body.data.tokens.accessToken, body.data.tokens.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && getRefreshToken()) {
    const ok = await tryRefresh();
    if (ok) {
      const h2 = new Headers(init.headers);
      h2.set('Accept', 'application/json');
      h2.set('Authorization', `Bearer ${getAccessToken()}`);
      if (init.body != null && !h2.has('Content-Type')) {
        h2.set('Content-Type', 'application/json');
      }
      res = await fetch(url, { ...init, headers: h2 });
    }
  }

  return res;
}

export async function authJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  return parseJsonResponse<T>(res);
}

export async function publicJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...init, headers });
  return parseJsonResponse<T>(res);
}
