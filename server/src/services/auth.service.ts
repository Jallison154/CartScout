/**
 * Auth business logic: register, login, refresh, me. Routes call here; no DB in routes.
 */
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import db from "../db/client.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, getAccessTokenExpirySeconds } from "../auth/jwt.js";
import type { AuthTokens } from "../types/index.js";
import { AppError } from "../types/index.js";

const REFRESH_DAYS = 7;

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createSession(userId: string): { accessToken: string; refreshToken: string; expiresIn: number } {
  const accessToken = signAccessToken({ sub: userId, type: "access" });
  const refreshToken = signRefreshToken({ sub: userId, type: "refresh" });
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const refreshId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(refreshId, userId, refreshTokenHash, refreshExpiresAt, now);
  const tokens: AuthTokens = {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
  return tokens;
}

export type AuthLoginResult = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthMeResult = {
  id: string;
  email: string;
  createdAt: string;
};

/** Register a new user. Body must be validated (e.g. via parseRegisterBody). Throws AppError on conflict. */
export async function register(body: { email: string; password: string }): Promise<AuthLoginResult> {
  const { email, password } = body;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, password_hash, now, now);

  const tokens = createSession(id);
  return { user: { id, email }, ...tokens };
}

/** Login. Body must be validated (e.g. via parseLoginBody). Throws AppError on invalid credentials. */
export async function login(body: { email: string; password: string }): Promise<AuthLoginResult> {
  const { email, password } = body;

  const user = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
    | { id: string; email: string; password_hash: string }
    | undefined;
  if (!user || !user.password_hash) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const tokens = createSession(user.id);
  return { user: { id: user.id, email: user.email }, ...tokens };
}

/** Exchange refresh token for new tokens. Token must be non-empty (validated by parseRefreshBody). Throws AppError on invalid/expired token. */
export async function refresh(refreshTokenFromBody: string): Promise<AuthLoginResult> {
  let payload: { sub: string; type: string };
  try {
    payload = verifyRefreshToken(refreshTokenFromBody);
  } catch {
    throw AppError.unauthorized("Refresh token expired or invalid");
  }
  if (payload.type !== "refresh") {
    throw AppError.unauthorized("Invalid token type");
  }

  const tokenHash = hashRefreshToken(refreshTokenFromBody);
  const row = db
    .prepare(
      "SELECT rt.id, rt.user_id, u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')"
    )
    .get(tokenHash) as { id: string; user_id: string; email: string } | undefined;
  if (!row) {
    throw AppError.unauthorized("Refresh token not found or expired");
  }

  db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(row.id);

  const tokens = createSession(row.user_id);
  return { user: { id: row.user_id, email: row.email }, ...tokens };
}

/** Get current user by id. Throws AppError.notFound if user does not exist. */
export function getMe(userId: string): AuthMeResult {
  const user = db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").get(userId) as
    | { id: string; email: string; created_at: string }
    | undefined;
  if (!user) {
    throw AppError.notFound("User not found");
  }
  return { id: user.id, email: user.email, createdAt: user.created_at };
}
