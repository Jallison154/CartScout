/**
 * Mount all routes under /api/v1 for stable, client-agnostic API.
 */
import { Router } from "express";
import authRoutes from "./auth.js";
import listsRoutes from "./lists.js";
import pushRoutes from "./push.js";
import storesRoutes from "./stores.js";
import productsRoutes from "./products.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/lists", listsRoutes);
router.use("/push", pushRoutes);
router.use("/stores", storesRoutes);
router.use("/products", productsRoutes);

export default router;
