import { HttpError } from './errors.js';

export function parsePositiveInt(raw: string | undefined, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new HttpError(400, `Invalid ${label}`, 'INVALID_ID');
  }
  return n;
}

export function parsePositiveIntParam(
  raw: string | string[] | undefined,
  label: string,
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === '') {
    throw new HttpError(400, `Invalid ${label}`, 'INVALID_ID');
  }
  return parsePositiveInt(s, label);
}

const BARCODE_MAX_LEN = 64;

/**
 * Path/query barcode: trim, length bounds, no control characters.
 * Express decodes `%` sequences in path params before this runs.
 */
export function parseBarcodeParam(raw: string | string[] | undefined): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || typeof s !== 'string') {
    throw new HttpError(400, 'Invalid barcode', 'INVALID_BARCODE');
  }
  const code = s.trim();
  if (code.length === 0) {
    throw new HttpError(400, 'Barcode is required', 'INVALID_BARCODE');
  }
  if (code.length > BARCODE_MAX_LEN) {
    throw new HttpError(400, 'Barcode is too long', 'INVALID_BARCODE');
  }
  if (/[\u0000-\u001f\u007f]/.test(code)) {
    throw new HttpError(400, 'Invalid barcode characters', 'INVALID_BARCODE');
  }
  return code;
}
