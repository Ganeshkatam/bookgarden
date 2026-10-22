import { createHmac } from "crypto";

const DEFAULT_RATE_LIMIT_SALT = "bookgarden_rate_limit_secret_salt_v1";

/**
 * Derives the server secret salt used for rate-limit key HMAC derivation.
 * Never exposed to browser or client code.
 *
 * Secret Rotation Strategy:
 * When RATE_LIMIT_HMAC_SECRET is rotated in production environment variables,
 * existing counter keys in internal.rate_limits naturally become inert and are
 * collected by internal.cleanup_expired_rate_limits(). Rotating the secret incurs
 * zero data loss, requires no schema migrations, and resets brute-force windows safely.
 */
export function getRateLimitSecret(): string {
  return (
    process.env.RATE_LIMIT_HMAC_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_RATE_LIMIT_SALT
  );
}

/**
 * Constructs an account-specific rate-limit key.
 * Trims whitespace and normalizes case/formatting to prevent trivial bypass.
 * Hashes the identifier with HMAC-SHA256 using a server-side secret to prevent offline dictionary guessing.
 */
export function buildRateLimitKey(
  identifier: string,
  isPhone: boolean,
  secretOverride?: string,
): string {
  const normalized = isPhone
    ? identifier.trim().replace(/[^\d+]/g, "")
    : identifier.trim().toLowerCase();
  const secret = secretOverride || getRateLimitSecret();
  const hmac = createHmac("sha256", secret).update(normalized).digest("hex");
  return `login:account:${hmac}`;
}

/**
 * Constructs a client network rate-limit key for layered IP throttling.
 * Hashes the client IP with HMAC-SHA256 to prevent network topology leakage in state tables.
 */
export function buildIpRateLimitKey(
  ip: string,
  secretOverride?: string,
): string {
  const normalized = ip.trim().toLowerCase();
  const secret = secretOverride || getRateLimitSecret();
  const hmac = createHmac("sha256", secret).update(normalized).digest("hex");
  return `login:ip:${hmac}`;
}
