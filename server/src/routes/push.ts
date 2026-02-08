/**
 * Register push device tokens for notifications (list reminders, price updates).
 */
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, asyncHandler } from "../middleware/response.js";

const router = Router();
router.use(requireAuth);

/** POST /api/v1/push/register - register device token */
router.post(
  "/register",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { token, platform } = req.body as { token?: string; platform?: string };
    if (!token || typeof token !== "string") {
      sendError(res, "VALIDATION_ERROR", "token is required", 400);
      return;
    }
    const plat = platform === "ios" || platform === "android" || platform === "web" ? platform : "web";
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT OR REPLACE INTO push_tokens (id, user_id, token, platform, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, userId, token, plat, now);
    res.status(201);
    sendSuccess(res, { registered: true });
  })
);

export default router;
