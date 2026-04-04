export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type ErrorEnvelope = { error?: { message?: string; code?: string; details?: unknown } };

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
      const joined = error.details
        .map((row: { message?: string }) => row.message)
        .filter(Boolean)
        .join(' ');
      if (joined) {
        return joined;
      }
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
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
