import { createHash } from "crypto";

/**
 * Constructs an account-specific rate-limit key.
 * Trims whitespace and normalizes case/formatting to prevent trivial bypass.
 * Hashes the identifier with SHA-256 to avoid persisting raw PII in database state tables.
 */
export function buildRateLimitKey(identifier: string, isPhone: boolean): string {
  const normalized = isPhone
    ? identifier.trim().replace(/[^\d+]/g, "")
    : identifier.trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `login:account:${hash}`;
}
