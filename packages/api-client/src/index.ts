import type { HealthResponse } from '@cartscout/types';

export type ApiClientConfig = {
  baseUrl: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export function createApiClient(config: ApiClientConfig) {
  const base = normalizeBaseUrl(config.baseUrl);

  return {
    async getHealth(): Promise<HealthResponse> {
      const response = await fetch(`${base}/health`);
      if (!response.ok) {
        throw new Error(`GET /health failed: ${response.status}`);
      }
      return response.json() as Promise<HealthResponse>;
    },
  };
}
