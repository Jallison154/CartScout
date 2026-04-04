import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../utils/errors.js';

function formatZodIssues(err: { issues: { path: (string | number)[]; message: string }[] }) {
  return err.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new HttpError(
          400,
          'Invalid request body',
          'VALIDATION_ERROR',
          formatZodIssues(parsed.error),
        ),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}
