/**
 * Push device token registration. Routes call here; no DB in routes.
 */
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { AppError } from "../types/index.js";
const PLATFORMS = ["ios", "android", "web"];
function normalizePlatform(platform) {
    if (platform === "ios" || platform === "android" || platform === "web") {
        return platform;
    }
    return "web";
}
/** Register a device push token for the user. Throws if token is missing. */
export function registerToken(userId, body) {
    const token = body.token;
    if (!token || typeof token !== "string") {
        throw AppError.validation("token is required");
    }
    const platform = normalizePlatform(body.platform);
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO push_tokens (id, user_id, token, platform, created_at) VALUES (?, ?, ?, ?, ?)").run(id, userId, token, platform, now);
    return { registered: true };
}
