/**
 * Register push device tokens for notifications (list reminders, price updates).
 */
import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";
import { registerToken } from "../services/push.service.js";

const router = Router();
router.use(requireAuth);

/** POST /api/v1/push/register - register device token */
router.post(
  "/register",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const body = req.body as { token?: string; platform?: string };
    const result = registerToken(userId, body);
    res.status(201);
    sendSuccess(res, result);
  })
);

export default router;
