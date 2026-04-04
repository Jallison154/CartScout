import { buildApiUrl } from '@/api/client';
import { ApiError } from '@/api/errors';

type ErrorEnvelope = {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
};

export async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, 'Invalid response from server', 'PARSE_ERROR');
  }

  if (!res.ok) {
    const e = json as ErrorEnvelope;
    throw new ApiError(
      res.status,
      e.error?.message ?? 'Request failed',
      e.error?.code,
      e.error?.details,
    );
  }

  return json as T;
}

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  return parseResponse<T>(res);
}

export async function apiPostJson<TResponse, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResponse> {
  const res = await fetch(buildApiUrl(path), {
    method: 'POST',
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  return parseResponse<TResponse>(res);
}
