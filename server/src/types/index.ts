/**
 * Shared server types. API contract is stable for web and mobile.
 */

export interface JwtPayload {
  sub: string;   // user id
  type: "access" | "refresh";
}

export interface ApiSuccess<T = unknown> {
  data: T;
  meta?: { pagination?: { total: number; limit: number; offset: number } };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}
