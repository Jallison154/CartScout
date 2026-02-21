/**
 * Minimal request logging: one line per request with method, path, status, and error code for 4xx/5xx.
 * No request bodies or tokens. Use for debugging and ops.
 */
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => {
    const status = res.statusCode;
    const errCode = (res as Response & { locals?: { errorCode?: string } }).locals?.errorCode;
    const line = errCode && status >= 400 ? `${req.method} ${req.path} ${status} ${errCode}` : `${req.method} ${req.path} ${status}`;
    console.log(line);
  });
  next();
}
