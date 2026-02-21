/**
 * JWT issue and verify for access and refresh tokens.
 * Tokens are returned in JSON body for mobile clients (not cookies).
 */
import jwt from "jsonwebtoken";
import { config } from "../config.js";
const { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn } = config.jwt;
// Cast: config strings like "15m" / "7d" are valid for jsonwebtoken; types expect StringValue
const accessSignOptions = { expiresIn: accessExpiresIn };
const refreshSignOptions = { expiresIn: refreshExpiresIn };
export function signAccessToken(payload) {
    return jwt.sign(payload, accessSecret, accessSignOptions);
}
export function signRefreshToken(payload) {
    return jwt.sign(payload, refreshSecret, refreshSignOptions);
}
export function verifyAccessToken(token) {
    return jwt.verify(token, accessSecret);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, refreshSecret);
}
export function getAccessTokenExpirySeconds() {
    const m = accessExpiresIn.match(/^(\d+)([smh])$/);
    if (!m)
        return 900;
    const n = parseInt(m[1], 10);
    const unit = m[2];
    if (unit === "s")
        return n;
    if (unit === "m")
        return n * 60;
    if (unit === "h")
        return n * 3600;
    return 900;
}
