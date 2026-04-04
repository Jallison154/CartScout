const MIN_SECRET_LENGTH = 32;

export type AuthConfig = {
  jwtAccessSecret: string;
  accessExpiresIn: string;
  refreshExpiresMs: number;
  bcryptRounds: number;
};

let cached: AuthConfig | undefined;

function readRefreshExpiresMs(): number {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS);
  const d = Number.isFinite(days) && days > 0 ? days : 7;
  return d * 24 * 60 * 60 * 1000;
}

function loadAuthConfig(): AuthConfig {
  const fromEnv = process.env.JWT_ACCESS_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && (!fromEnv || fromEnv.length < MIN_SECRET_LENGTH)) {
    throw new Error(
      `JWT_ACCESS_SECRET is required in production (min ${MIN_SECRET_LENGTH} characters).`,
    );
  }

  const jwtAccessSecret =
    fromEnv && fromEnv.length >= MIN_SECRET_LENGTH
      ? fromEnv
      : 'dev-only-insecure-secret-min-32-chars!!';

  if (!isProd && jwtAccessSecret === 'dev-only-insecure-secret-min-32-chars!!') {
    console.warn(
      '[auth] Using default JWT_ACCESS_SECRET; set a strong secret before production.',
    );
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS);
  const rounds =
    Number.isFinite(bcryptRounds) && bcryptRounds >= 10 && bcryptRounds <= 14
      ? bcryptRounds
      : 12;

  return {
    jwtAccessSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN?.trim() || '15m',
    refreshExpiresMs: readRefreshExpiresMs(),
    bcryptRounds: rounds,
  };
}

/**
 * Returns cached auth config; validates env on first call.
 * Call early at startup (e.g. right after DB init).
 */
export function getAuthConfig(): AuthConfig {
  if (!cached) {
    cached = loadAuthConfig();
  }
  return cached;
}

export function assertAuthConfig(): void {
  getAuthConfig();
}

/** Tests: reset cached config after env changes */
export function resetAuthConfigCache(): void {
  cached = undefined;
}
