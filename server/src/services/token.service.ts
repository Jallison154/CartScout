import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { getAuthConfig } from '../config/auth.js';
import * as refreshTokenRepository from '../repositories/refreshToken.repository.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  typ: 'access';
};

export function signAccessToken(
  userId: number,
  email: string,
): { token: string; accessExpiresIn: number } {
  const cfg = getAuthConfig();
  const payload: AccessTokenPayload = {
    sub: String(userId),
    email,
    typ: 'access',
  };
  const signOptions: SignOptions = {
    expiresIn: cfg.accessExpiresIn as SignOptions['expiresIn'],
  };
  const token = jwt.sign(payload, cfg.jwtAccessSecret, signOptions);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const accessExpiresIn =
    decoded?.exp !== undefined
      ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
      : 0;
  return { token, accessExpiresIn };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const cfg = getAuthConfig();
  const decoded = jwt.verify(token, cfg.jwtAccessSecret) as AccessTokenPayload;
  if (decoded.typ !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

function generateRefreshSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshSecret(secret: string): string {
  return bcrypt.hashSync(secret, getAuthConfig().bcryptRounds);
}

export function verifyRefreshSecret(secret: string, hash: string): boolean {
  return bcrypt.compareSync(secret, hash);
}

export function buildRefreshTokenString(rowId: number, secret: string): string {
  return `${rowId}|${secret}`;
}

export function parseRefreshTokenString(raw: string): { rowId: number; secret: string } | null {
  const idx = raw.indexOf('|');
  if (idx <= 0) {
    return null;
  }
  const idPart = raw.slice(0, idx);
  const secret = raw.slice(idx + 1);
  if (!secret) {
    return null;
  }
  const rowId = Number(idPart);
  if (!Number.isInteger(rowId) || rowId < 1) {
    return null;
  }
  return { rowId, secret };
}

export function issueRefreshToken(userId: number): { rawToken: string; expiresAtIso: string } {
  const cfg = getAuthConfig();
  const expires = new Date(Date.now() + cfg.refreshExpiresMs);
  const expiresAtIso = expires.toISOString();
  const secret = generateRefreshSecret();
  const hash = hashRefreshSecret(secret);
  const id = refreshTokenRepository.insertRefreshToken(userId, hash, expiresAtIso);
  const rawToken = buildRefreshTokenString(id, secret);
  return { rawToken, expiresAtIso };
}

/**
 * Validates the opaque refresh token without revoking it (caller revokes after user check).
 */
export function validateRefreshTokenForRotation(
  rawOld: string,
): { userId: number; rowId: number } | null {
  const parsed = parseRefreshTokenString(rawOld.trim());
  if (!parsed) {
    return null;
  }
  const row = refreshTokenRepository.findRefreshTokenById(parsed.rowId);
  if (!row) {
    return null;
  }
  const exp = new Date(row.expires_at).getTime();
  if (!Number.isFinite(exp) || exp <= Date.now()) {
    refreshTokenRepository.deleteRefreshTokenById(row.id);
    return null;
  }
  if (!verifyRefreshSecret(parsed.secret, row.token_hash)) {
    return null;
  }
  return { userId: row.user_id, rowId: row.id };
}
