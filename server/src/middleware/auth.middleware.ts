import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service.js';
import { HttpError } from '../utils/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing or invalid Authorization header', 'AUTH_REQUIRED'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new HttpError(401, 'Missing or invalid Authorization header', 'AUTH_REQUIRED'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired access token', 'INVALID_ACCESS_TOKEN'));
  }
}
