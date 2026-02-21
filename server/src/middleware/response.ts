/**
 * Consistent API response shape for all clients (web + mobile).
 * Success: { data, meta? }. Error: { error: { code, message } }.
 */
import type { Request, Response, NextFunction } from "express";
import type { ApiError, ApiSuccess } from "../types/index.js";

export function sendSuccess<T>(res: Response, data: T, meta?: ApiSuccess["meta"]): void {
  const body: { data: T; meta?: typeof meta } = { data };
  if (meta) body.meta = meta;
  res.json(body);
}

export function sendError(res: Response, code: string, message: string, statusCode: number = 400): void {
  res.locals = res.locals || {};
  (res.locals as { errorCode?: string }).errorCode = code;
  const body: ApiError = { error: { code, message } };
  res.status(statusCode).json(body);
}

/** Async route wrapper: AppError → JSON error response; other errors → 500 INTERNAL_ERROR */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      const isAppError = err?.name === "AppError" && typeof err?.code === "string" && typeof err?.statusCode === "number";
      const code = isAppError ? err.code : "INTERNAL_ERROR";
      const message = err?.message && typeof err.message === "string" ? err.message : "An unexpected error occurred";
      const status = isAppError ? err.statusCode : 500;
      sendError(res, code, message, status);
    });
  };
}
