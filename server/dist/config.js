const DEV_ACCESS_SECRET = "dev-access-secret-change-in-production";
const DEV_REFRESH_SECRET = "dev-refresh-secret-change-in-production";
const MIN_SECRET_LENGTH = 32;
/**
 * Server config from env. Used for API and auth (mobile-ready: token-based).
 */
export const config = {
    port: Number(process.env.PORT) || 4000,
    nodeEnv: process.env.NODE_ENV || "development",
    /** JWT: access token (short-lived) and refresh token (long-lived) for mobile secure storage */
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    /** Database path (SQLite for MVP) */
    databasePath: process.env.DATABASE_PATH || ":memory:",
};
/** Call before serving: in production, refuse to start with default or weak JWT secrets. */
export function assertProductionSecrets() {
    if (config.nodeEnv !== "production")
        return;
    const { accessSecret, refreshSecret } = config.jwt;
    if (accessSecret === DEV_ACCESS_SECRET ||
        refreshSecret === DEV_REFRESH_SECRET ||
        accessSecret.length < MIN_SECRET_LENGTH ||
        refreshSecret.length < MIN_SECRET_LENGTH) {
        console.error("Fatal: In production, set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to long random strings (min 32 chars). Do not use default dev secrets.");
        process.exit(1);
    }
}
