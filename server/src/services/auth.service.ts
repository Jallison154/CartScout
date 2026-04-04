import * as refreshTokenRepository from '../repositories/refreshToken.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { HttpError } from '../utils/errors.js';
import * as passwordService from './password.service.js';
import * as tokenService from './token.service.js';

export type AuthTokensPayload = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  tokenType: 'Bearer';
};

export type AuthSuccessBody = {
  user: { id: number; email: string };
  tokens: AuthTokensPayload;
};

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    code === 'SQLITE_CONSTRAINT' ||
    message.includes('UNIQUE constraint failed')
  );
}

function buildTokenResponse(
  userId: number,
  email: string,
  refreshRaw: string,
): AuthSuccessBody {
  const access = tokenService.signAccessToken(userId, email);
  return {
    user: { id: userId, email },
    tokens: {
      accessToken: access.token,
      refreshToken: refreshRaw,
      accessExpiresIn: access.accessExpiresIn,
      tokenType: 'Bearer',
    },
  };
}

export function register(email: string, password: string): AuthSuccessBody {
  const passwordHash = passwordService.hashPassword(password);
  let user: { id: number; email: string };
  try {
    user = userRepository.createUser(email, passwordHash);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, 'An account with this email already exists', 'EMAIL_IN_USE');
    }
    throw error;
  }
  const { rawToken } = tokenService.issueRefreshToken(user.id);
  return buildTokenResponse(user.id, user.email, rawToken);
}

export function login(email: string, password: string): AuthSuccessBody {
  const user = userRepository.findUserByEmail(email);
  if (!user || !passwordService.verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const { rawToken } = tokenService.issueRefreshToken(user.id);
  return buildTokenResponse(user.id, user.email, rawToken);
}

export function refresh(refreshToken: string): AuthSuccessBody {
  const validated = tokenService.validateRefreshTokenForRotation(refreshToken);
  if (!validated) {
    throw new HttpError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
  const user = userRepository.findUserById(validated.userId);
  if (!user) {
    refreshTokenRepository.deleteRefreshTokenById(validated.rowId);
    throw new HttpError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
  refreshTokenRepository.deleteRefreshTokenById(validated.rowId);
  const { rawToken } = tokenService.issueRefreshToken(user.id);
  return buildTokenResponse(user.id, user.email, rawToken);
}

export function getSessionUser(userId: number): { id: number; email: string } {
  const user = userRepository.findUserById(userId);
  if (!user) {
    throw new HttpError(401, 'Invalid or expired access token', 'INVALID_ACCESS_TOKEN');
  }
  return user;
}
