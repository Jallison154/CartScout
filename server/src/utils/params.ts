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
