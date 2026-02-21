/**
 * Product search for add-item suggestions. GET /api/v1/products/search?q=
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";
import { searchProducts } from "../services/products.service.js";
const router = Router();
router.use(requireAuth);
/** GET /api/v1/products/search?q= - search canonical products by name (for suggestions) */
router.get("/search", asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limit = Math.min(Number(req.query.limit) || 15, 30);
    const products = searchProducts(q, limit);
    sendSuccess(res, products);
}));
export default router;
