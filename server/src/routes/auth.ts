/**
 * Auth routes: register, login, refresh, me.
 * Tokens returned in JSON body for mobile (store in SecureStore/Keychain).
 */
import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";
import { register as registerService, login as loginService, refresh as refreshService, getMe } from "../services/auth.service.js";
import { parseRegisterBody, parseLoginBody, parseRefreshBody } from "../validators/auth.validator.js";

const router = Router();

/** POST /api/v1/auth/register */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = parseRegisterBody(req.body);
    const result = await registerService(body);
    res.status(201);
    sendSuccess(res, result, undefined);
  })
);

/** POST /api/v1/auth/login */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = parseLoginBody(req.body);
    const result = await loginService(body);
    sendSuccess(res, result, undefined);
  })
);

/** POST /api/v1/auth/refresh - exchange refresh token for new access (and refresh) token */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = parseRefreshBody(req.body);
    const result = await refreshService(refreshToken);
    sendSuccess(res, result, undefined);
  })
);

/** GET /api/v1/auth/me - current user (requires Bearer) */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const user = getMe(userId);
    sendSuccess(res, user, undefined);
  })
);

export default router;
