import { isApiError } from '@/api/errors';

function isGenericApiMessage(message: string | undefined): boolean {
  const m = message?.trim() ?? '';
  return m.length === 0 || m === 'Request failed' || m === 'Network request failed';
}

function messageForStatus(status: number): string | undefined {
  switch (status) {
    case 401:
      return 'Sign in again to continue.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return 'That item was not found.';
    case 408:
    case 504:
      return 'The request timed out. Try again.';
    case 429:
      return 'Too many requests. Wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'The server had a problem. Try again in a moment.';
    default:
      return undefined;
  }
}

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return 'No internet connection. Check your network and try again.';
  }

  if (isApiError(error)) {
    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
      const joined = error.details
        .map((row: { message?: string }) => row.message)
        .filter(Boolean)
        .join(' ');
      if (joined.length) {
        return joined;
      }
    }

    const raw = error.message?.trim() ?? '';
    if (isGenericApiMessage(raw)) {
      return messageForStatus(error.statusCode) ?? 'Something went wrong. Try again.';
    }
    return raw;
  }

  if (error instanceof Error) {
    const m = error.message.trim();
    if (m === 'Network request failed' || m === 'Failed to fetch') {
      return 'No internet connection. Check your network and try again.';
    }
    return m || 'Something went wrong. Try again.';
  }

  return 'Something went wrong. Try again.';
}
