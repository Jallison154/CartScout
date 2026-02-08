/**
 * Server config from env. Used for API and auth (mobile-ready: token-based).
 */
export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",

  /** JWT: access token (short-lived) and refresh token (long-lived) for mobile secure storage */
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-in-production",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  /** Database path (SQLite for MVP) */
  databasePath: process.env.DATABASE_PATH || ":memory:",
};
