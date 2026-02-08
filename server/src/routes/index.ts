/**
 * Mount all routes under /api/v1 for stable, client-agnostic API.
 */
import { Router } from "express";
import authRoutes from "./auth.js";
import listsRoutes from "./lists.js";
import pushRoutes from "./push.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/lists", listsRoutes);
router.use("/push", pushRoutes);

export default router;
