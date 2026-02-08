/**
 * Auth routes: register, login, refresh.
 * Tokens returned in JSON body for mobile (store in SecureStore/Keychain).
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, getAccessTokenExpirySeconds } from "../auth/jwt.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, asyncHandler } from "../middleware/response.js";
import type { AuthTokens } from "../types/index.js";
import crypto from "crypto";

const router = Router();

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** POST /api/v1/auth/register */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      sendError(res, "VALIDATION_ERROR", "Email and password are required", 400);
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length < 3) {
      sendError(res, "VALIDATION_ERROR", "Invalid email", 400);
      return;
    }
    if (password.length < 8) {
      sendError(res, "VALIDATION_ERROR", "Password must be at least 8 characters", 400);
      return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as { id: string } | undefined;
    if (existing) {
      sendError(res, "CONFLICT", "An account with this email already exists", 409);
      return;
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, normalizedEmail, password_hash, now, now);

    const accessToken = signAccessToken({ sub: id, type: "access" });
    const refreshToken = signRefreshToken({ sub: id, type: "refresh" });
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const refreshId = uuidv4();
    db.prepare(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(refreshId, id, refreshTokenHash, refreshExpiresAt, now);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
    };
    sendSuccess(res, { user: { id, email: normalizedEmail }, ...tokens }, undefined);
  })
);

/** POST /api/v1/auth/login */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      sendError(res, "VALIDATION_ERROR", "Email and password are required", 400);
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(normalizedEmail) as
      | { id: string; email: string; password_hash: string }
      | undefined;
    if (!user || !user.password_hash) {
      sendError(res, "UNAUTHORIZED", "Invalid email or password", 401);
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      sendError(res, "UNAUTHORIZED", "Invalid email or password", 401);
      return;
    }

    const accessToken = signAccessToken({ sub: user.id, type: "access" });
    const refreshToken = signRefreshToken({ sub: user.id, type: "refresh" });
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const refreshId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(refreshId, user.id, refreshTokenHash, refreshExpiresAt, now);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
    };
    sendSuccess(res, { user: { id: user.id, email: user.email }, ...tokens }, undefined);
  })
);

/** POST /api/v1/auth/refresh - exchange refresh token for new access (and optional refresh) token */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body as { refreshToken?: string };
    if (!token || typeof token !== "string") {
      sendError(res, "VALIDATION_ERROR", "refreshToken is required", 400);
      return;
    }

    let payload: { sub: string; type: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      sendError(res, "UNAUTHORIZED", "Refresh token expired or invalid", 401);
      return;
    }
    if (payload.type !== "refresh") {
      sendError(res, "UNAUTHORIZED", "Invalid token type", 401);
      return;
    }

    const tokenHash = hashRefreshToken(token);
    const row = db
      .prepare(
        "SELECT rt.id, rt.user_id, u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')"
      )
      .get(tokenHash) as { id: string; user_id: string; email: string } | undefined;
    if (!row) {
      sendError(res, "UNAUTHORIZED", "Refresh token not found or expired", 401);
      return;
    }

    db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(row.id);

    const accessToken = signAccessToken({ sub: row.user_id, type: "access" });
    const newRefreshToken = signRefreshToken({ sub: row.user_id, type: "refresh" });
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const refreshId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(refreshId, row.user_id, newRefreshTokenHash, refreshExpiresAt, now);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
    };
    sendSuccess(res, { user: { id: row.user_id, email: row.email }, ...tokens }, undefined);
  })
);

/** GET /api/v1/auth/me - current user (requires Bearer) */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return;
    const user = db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").get(req.userId) as
      | { id: string; email: string; created_at: string }
      | undefined;
    if (!user) {
      sendError(res, "NOT_FOUND", "User not found", 404);
      return;
    }
    sendSuccess(res, { id: user.id, email: user.email, createdAt: user.created_at }, undefined);
  })
);

export default router;
