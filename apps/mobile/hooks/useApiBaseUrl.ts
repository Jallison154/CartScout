import { useMemo } from 'react';
import { getApiBaseUrl } from '@/api/config';

/**
 * Normalized API origin from `EXPO_PUBLIC_API_URL` (no trailing slash).
 * Empty string when unset — useful to show setup hints on dev builds.
 */
export function useApiBaseUrl(): string {
  return useMemo(() => getApiBaseUrl(), []);
}
