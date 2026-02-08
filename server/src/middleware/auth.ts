/**
 * Validate Bearer access token. Attach user id to request.
 * Mobile clients send: Authorization: Bearer <accessToken>
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { sendError } from "./response.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "UNAUTHORIZED", "Missing or invalid authorization header", 401);
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      sendError(res, "UNAUTHORIZED", "Invalid token type", 401);
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    sendError(res, "UNAUTHORIZED", "Token expired or invalid", 401);
  }
}
