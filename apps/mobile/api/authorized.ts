import { refreshRequest } from '@/api/auth';
import { buildApiUrl } from '@/api/client';
import { ApiError } from '@/api/errors';
import { parseResponse } from '@/api/http';
import { notifySessionInvalidated } from '@/services/sessionBridge';
import * as tokenStorage from '@/services/tokenStorage';

async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
  didRefresh: boolean,
): Promise<Response> {
  const token = await tokenStorage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'Not signed in', 'AUTH_REQUIRED');
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(buildApiUrl(path), { ...init, headers });

  if (res.status === 401 && !didRefresh) {
    const refresh = await tokenStorage.getRefreshToken();
    if (refresh) {
      try {
        const session = await refreshRequest(refresh);
        await tokenStorage.saveTokens(
          session.tokens.accessToken,
          session.tokens.refreshToken,
        );
        return fetchWithAuth(path, init, true);
      } catch {
        await tokenStorage.clearTokens();
        notifySessionInvalidated();
      }
    }
  }

  if (res.status === 401 && didRefresh) {
    await tokenStorage.clearTokens();
    notifySessionInvalidated();
  }

  return res;
}

export async function authGetJson<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(path, { method: 'GET' }, false);
  return parseResponse<T>(res);
}

export async function authPostJson<TResponse, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await fetchWithAuth(
    path,
    { method: 'POST', body: JSON.stringify(body) },
    false,
  );
  return parseResponse<TResponse>(res);
}

export async function authPatchJson<TResponse, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await fetchWithAuth(
    path,
    { method: 'PATCH', body: JSON.stringify(body) },
    false,
  );
  return parseResponse<TResponse>(res);
}

export async function authDelete(path: string): Promise<void> {
  const res = await fetchWithAuth(path, { method: 'DELETE' }, false);
  if (res.ok && res.status === 204) {
    return;
  }
  await parseResponse<Record<string, never>>(res);
}
