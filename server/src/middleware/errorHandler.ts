import type { NextFunction, Request, Response } from 'express';
import { HttpError, isHttpError } from '../utils/errors.js';

const isProduction = process.env.NODE_ENV === 'production';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error(err);

  const message =
    !isProduction && err instanceof Error ? err.message : 'Internal Server Error';

  res.status(500).json({
    error: {
      message,
      ...(!isProduction && err instanceof Error && err.stack
        ? { stack: err.stack }
        : {}),
    },
  });
}
