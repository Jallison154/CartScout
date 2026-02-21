/**
 * Mount all v1 routes under /api/v1 for stable, client-agnostic API.
 */
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import listsRoutes from "./lists.routes.js";
import pushRoutes from "./push.routes.js";
import storesRoutes from "./stores.routes.js";
import productsRoutes from "./products.routes.js";
const router = Router();
router.use("/auth", authRoutes);
router.use("/lists", listsRoutes);
router.use("/push", pushRoutes);
router.use("/stores", storesRoutes);
router.use("/products", productsRoutes);
export default router;
