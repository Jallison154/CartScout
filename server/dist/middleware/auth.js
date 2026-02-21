import { verifyAccessToken } from "../auth/jwt.js";
import { sendError } from "./response.js";
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        sendError(res, "UNAUTHORIZED", "Missing or invalid authorization header", 401);
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        if (payload.type !== "access") {
            sendError(res, "UNAUTHORIZED", "Invalid token type", 401);
            return;
        }
        req.userId = payload.sub;
        next();
    }
    catch {
        sendError(res, "UNAUTHORIZED", "Token expired or invalid", 401);
    }
}
