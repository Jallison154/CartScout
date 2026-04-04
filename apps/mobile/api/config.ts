/**
 * Public env — embedded at build time. Use your machine's LAN IP for device testing.
 * @example EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
 */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    return '';
  }
  return raw.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}
