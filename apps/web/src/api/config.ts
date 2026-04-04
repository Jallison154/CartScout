/**
 * API origin (no trailing slash).
 * - If `VITE_API_URL` is set at build time, it wins (needed for Vite dev against a remote API).
 * - If unset in production build, uses `window.location.origin` so the UI can be served from the same Express app as the API (`WEB_UI_DIST`).
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (!import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}
