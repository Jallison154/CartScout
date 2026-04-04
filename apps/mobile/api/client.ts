import { getApiBaseUrl } from '@/api/config';

/**
 * Build an absolute URL for an API path. Does not perform network calls.
 * Throws if `EXPO_PUBLIC_API_URL` is missing — use only once wiring real requests.
 */
export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
