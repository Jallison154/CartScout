/**
 * Product search for add-item suggestions. GET /api/v1/products/search?q=
 */
import { Router } from "express";
import db from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";

const router = Router();
router.use(requireAuth);

/** GET /api/v1/products/search?q= - search canonical products by name (for suggestions) */
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Number(req.query.limit) || 15, 30);
    if (!q) {
      sendSuccess(res, []);
      return;
    }
    const pattern = `%${q}%`;
    const products = db.prepare(
      `SELECT id, display_name, brand, category, size_description, sold_by, image_url, source
       FROM canonical_products
       WHERE display_name LIKE ? OR (brand IS NOT NULL AND brand LIKE ?)
       ORDER BY display_name LIMIT ?`
    ).all(pattern, pattern, limit) as Array<Record<string, unknown>>;
    sendSuccess(res, products);
  })
);

export default router;
