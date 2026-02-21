/**
 * CartScout API server. API-first for web and mobile (iOS/Android).
 * Base path: /api/v1. Auth: Bearer token (accessToken); refresh via POST /api/v1/auth/refresh.
 */
import express from "express";
import cors from "cors";
import { initDb, pingDb, pruneExpiredRefreshTokens } from "./db/client.js";
import { sendError } from "./middleware/response.js";
import { requestLogger } from "./middleware/requestLogger.js";
import v1Routes from "./api/v1/index.js";
import { config, assertProductionSecrets } from "./config.js";
assertProductionSecrets();
initDb();
pruneExpiredRefreshTokens();
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use("/api/v1", v1Routes);
app.get("/health", (_req, res) => {
    if (!pingDb()) {
        res.status(503).json({ status: "error", message: "Database unavailable" });
        return;
    }
    res.json({ status: "ok", version: "0.1.0" });
});
app.use((_req, res) => {
    sendError(res, "NOT_FOUND", "Not found", 404);
});
app.use((err, _req, res, _next) => {
    console.error(err);
    sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", 500);
});
app.listen(config.port, () => {
    console.log(`CartScout API listening on http://localhost:${config.port} (api: /api/v1)`);
});
