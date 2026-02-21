/**
 * Stores and user favorite stores. GET /api/v1/stores, GET/POST/DELETE /api/v1/stores/favorites.
 */
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../../middleware/response.js";
import { getAllStores, getFavoriteStoreIds, addFavorite, removeFavorite, } from "../../services/stores.service.js";
const router = Router();
router.use(requireAuth);
/** GET /api/v1/stores - list all stores (for settings store picker) */
router.get("/", asyncHandler(async (_req, res) => {
    const stores = getAllStores();
    sendSuccess(res, stores);
}));
/** GET /api/v1/stores/favorites - list current user's favorite store ids */
router.get("/favorites", asyncHandler(async (req, res) => {
    const userId = req.userId;
    const ids = getFavoriteStoreIds(userId);
    sendSuccess(res, ids);
}));
/** POST /api/v1/stores/favorites - add a store to favorites (body: { store_id }) */
router.post("/favorites", asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { store_id } = req.body;
    const ids = addFavorite(userId, store_id ?? "");
    res.status(201);
    sendSuccess(res, ids);
}));
/** DELETE /api/v1/stores/favorites/:storeId - remove store from favorites */
router.delete("/favorites/:storeId", asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { storeId } = req.params;
    const ids = removeFavorite(userId, storeId);
    sendSuccess(res, ids);
}));
export default router;
