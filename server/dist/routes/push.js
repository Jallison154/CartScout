/**
 * Register push device tokens for notifications (list reminders, price updates).
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";
import { registerToken } from "../services/push.service.js";
const router = Router();
router.use(requireAuth);
/** POST /api/v1/push/register - register device token */
router.post("/register", asyncHandler(async (req, res) => {
    const userId = req.userId;
    const body = req.body;
    const result = registerToken(userId, body);
    res.status(201);
    sendSuccess(res, result);
}));
export default router;
