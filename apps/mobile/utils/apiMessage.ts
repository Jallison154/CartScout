import { isApiError } from '@/api/errors';

export function formatApiErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
      return error.details
        .map((row: { message?: string }) => row.message)
        .filter(Boolean)
        .join(' ');
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}
