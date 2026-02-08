/**
 * JWT issue and verify for access and refresh tokens.
 * Tokens are returned in JSON body for mobile clients (not cookies).
 */
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { JwtPayload } from "../types/index.js";

const { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn } = config.jwt;

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}

export function getAccessTokenExpirySeconds(): number {
  const m = accessExpiresIn.match(/^(\d+)([smh])$/);
  if (!m) return 900;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  return 900;
}
