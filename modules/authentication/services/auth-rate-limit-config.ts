import "server-only";

/**
 * Server-Side Authentication Rate Limiting Configuration Contract.
 *
 * Establishes a single authoritative, validated configuration source for:
 * - Account-level brute-force protection (max login attempts, window, lockout)
 * - Network-level IP request budget throttling
 *
 * Implements strict startup validation:
 * - Missing variables gracefully fall back to hardened security baseline defaults.
 * - Malformed, non-integer, negative, or zero values fail fast at startup.
 * - Out-of-bounds thresholds fail fast with explicit configuration errors.
 * - Inconsistent cross-field relationships (e.g. lockout duration shorter than tracking window) fail fast.
 */

export interface AuthRateLimitConfig {
  /** Maximum consecutive failed password attempts permitted before account lockout. Baseline default: 5 */
  readonly maxLoginAttempts: number;
  /** Sliding window duration in milliseconds for failure tracking. Baseline default: 900,000 (15 min) */
  readonly rateLimitWindowMs: number;
  /** Lockout duration in milliseconds when maxLoginAttempts is reached. Baseline default: 3,600,000 (1 hour) */
  readonly lockoutDurationMs: number;
  /** Maximum login requests permitted from a single client network IP within rateLimitWindowMs. Baseline default: 30 */
  readonly maxIpLoginAttempts: number;
}

export const AUTH_RATE_LIMIT_DEFAULTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes = 900,000 ms
  LOCKOUT_DURATION_MS: 60 * 60 * 1000, // 1 hour = 3,600,000 ms
  MAX_IP_LOGIN_ATTEMPTS: 30,
} as const;

export const AUTH_RATE_LIMIT_BOUNDS = {
  MAX_LOGIN_ATTEMPTS: { min: 1, max: 20 },
  RATE_LIMIT_WINDOW_MS: { min: 60_000, max: 86_400_000 }, // 1 minute to 24 hours
  LOCKOUT_DURATION_MS: { min: 60_000, max: 604_800_000 }, // 1 minute to 7 days
  MAX_IP_LOGIN_ATTEMPTS: { min: 5, max: 1000 },
} as const;

/**
 * Parses and validates a single integer environment variable against defined bounds.
 * Throws a descriptive configuration error if the value is malformed or out of range.
 */
function parseIntegerEnv(
  key: string,
  rawVal: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (rawVal === undefined || rawVal === null || rawVal.trim() === "") {
    return defaultValue;
  }

  const trimmed = rawVal.trim();

  // Enforce strictly digits (optional leading sign, but negative is checked by bounds)
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error(
      `[Security Configuration Error] ${key} must be a valid integer, received: "${rawVal}"`,
    );
  }

  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `[Security Configuration Error] ${key} parsed as NaN from: "${rawVal}"`,
    );
  }

  if (parsed < min || parsed > max) {
    throw new Error(
      `[Security Configuration Error] ${key} must be between ${min} and ${max}, received: ${parsed}`,
    );
  }

  return parsed;
}

/**
 * Validates invariant relationships between rate-limiting settings.
 */
function validateRelationships(
  maxLoginAttempts: number,
  rateLimitWindowMs: number,
  lockoutDurationMs: number,
  maxIpLoginAttempts: number,
): void {
  if (lockoutDurationMs < rateLimitWindowMs) {
    throw new Error(
      `[Security Configuration Error] LOCKOUT_DURATION_MS (${lockoutDurationMs}ms) cannot be shorter than RATE_LIMIT_WINDOW_MS (${rateLimitWindowMs}ms).`,
    );
  }

  if (maxIpLoginAttempts < maxLoginAttempts) {
    throw new Error(
      `[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS (${maxIpLoginAttempts}) cannot be less than MAX_LOGIN_ATTEMPTS (${maxLoginAttempts}).`,
    );
  }
}

/**
 * Resolves and validates the complete authentication rate-limit configuration.
 * Accepts an optional environment dictionary to support deterministic testing.
 */
export function resolveAuthRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthRateLimitConfig {
  const maxLoginAttempts = parseIntegerEnv(
    "MAX_LOGIN_ATTEMPTS",
    env.MAX_LOGIN_ATTEMPTS,
    AUTH_RATE_LIMIT_DEFAULTS.MAX_LOGIN_ATTEMPTS,
    AUTH_RATE_LIMIT_BOUNDS.MAX_LOGIN_ATTEMPTS.min,
    AUTH_RATE_LIMIT_BOUNDS.MAX_LOGIN_ATTEMPTS.max,
  );

  const rateLimitWindowMs = parseIntegerEnv(
    "RATE_LIMIT_WINDOW_MS",
    env.RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_DEFAULTS.RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_BOUNDS.RATE_LIMIT_WINDOW_MS.min,
    AUTH_RATE_LIMIT_BOUNDS.RATE_LIMIT_WINDOW_MS.max,
  );

  const lockoutDurationMs = parseIntegerEnv(
    "LOCKOUT_DURATION_MS",
    env.LOCKOUT_DURATION_MS,
    AUTH_RATE_LIMIT_DEFAULTS.LOCKOUT_DURATION_MS,
    AUTH_RATE_LIMIT_BOUNDS.LOCKOUT_DURATION_MS.min,
    AUTH_RATE_LIMIT_BOUNDS.LOCKOUT_DURATION_MS.max,
  );

  const maxIpLoginAttempts = parseIntegerEnv(
    "MAX_IP_LOGIN_ATTEMPTS",
    env.MAX_IP_LOGIN_ATTEMPTS,
    AUTH_RATE_LIMIT_DEFAULTS.MAX_IP_LOGIN_ATTEMPTS,
    AUTH_RATE_LIMIT_BOUNDS.MAX_IP_LOGIN_ATTEMPTS.min,
    AUTH_RATE_LIMIT_BOUNDS.MAX_IP_LOGIN_ATTEMPTS.max,
  );

  validateRelationships(
    maxLoginAttempts,
    rateLimitWindowMs,
    lockoutDurationMs,
    maxIpLoginAttempts,
  );

  return Object.freeze({
    maxLoginAttempts,
    rateLimitWindowMs,
    lockoutDurationMs,
    maxIpLoginAttempts,
  });
}

let cachedConfig: AuthRateLimitConfig | null = null;

/**
 * Returns the validated, singleton authentication rate-limit configuration.
 * Validates lazily on first access and caches for subsequent calls.
 */
export function getAuthRateLimitConfig(): AuthRateLimitConfig {
  if (!cachedConfig) {
    cachedConfig = resolveAuthRateLimitConfig();
  }
  return cachedConfig;
}

/**
 * Resets the cached configuration singleton. Used exclusively for testing.
 */
export function resetAuthRateLimitConfigCache(): void {
  cachedConfig = null;
}
