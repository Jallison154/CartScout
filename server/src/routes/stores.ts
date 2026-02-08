/**
 * Stores and user favorite stores. GET /api/v1/stores, GET/POST/DELETE /api/v1/stores/favorites.
 */
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, asyncHandler } from "../middleware/response.js";

const router = Router();
router.use(requireAuth);

/** GET /api/v1/stores - list all stores (for settings store picker) */
router.get(
  "/",
  asyncHandler(async (_req: AuthRequest, res) => {
    const stores = db.prepare(
      "SELECT id, external_id, name, address_line, city, state, zip_code, chain, source FROM stores ORDER BY chain, name"
    ).all() as Array<Record<string, unknown>>;
    sendSuccess(res, stores);
  })
);

/** GET /api/v1/stores/favorites - list current user's favorite store ids */
router.get(
  "/favorites",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const rows = db.prepare(
      "SELECT store_id FROM user_favorite_stores WHERE user_id = ?"
    ).all(userId) as Array<{ store_id: string }>;
    sendSuccess(res, rows.map((r) => r.store_id));
  })
);

/** POST /api/v1/stores/favorites - add a store to favorites (body: { store_id }) */
router.post(
  "/favorites",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { store_id } = req.body as { store_id?: string };
    if (!store_id || typeof store_id !== "string") {
      sendError(res, "VALIDATION_ERROR", "store_id is required", 400);
      return;
    }
    const store = db.prepare("SELECT id FROM stores WHERE id = ?").get(store_id);
    if (!store) {
      sendError(res, "NOT_FOUND", "Store not found", 404);
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT OR IGNORE INTO user_favorite_stores (id, user_id, store_id, created_at) VALUES (?, ?, ?, ?)"
    ).run(id, userId, store_id, now);
    const list = db.prepare(
      "SELECT store_id FROM user_favorite_stores WHERE user_id = ?"
    ).all(userId) as Array<{ store_id: string }>;
    res.status(201);
    sendSuccess(res, list.map((r) => r.store_id));
  })
);

/** DELETE /api/v1/stores/favorites/:storeId - remove store from favorites */
router.delete(
  "/favorites/:storeId",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { storeId } = req.params;
    db.prepare(
      "DELETE FROM user_favorite_stores WHERE user_id = ? AND store_id = ?"
    ).run(userId, storeId);
    const list = db.prepare(
      "SELECT store_id FROM user_favorite_stores WHERE user_id = ?"
    ).all(userId) as Array<{ store_id: string }>;
    sendSuccess(res, list.map((r) => r.store_id));
  })
);

export default router;
