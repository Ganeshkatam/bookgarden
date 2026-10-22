/**
 * Rate Limiter — Domain Port
 *
 * Defines the contract for rate limiting authentication attempts.
 * Implementations can use Postgres, Redis, or any other backing store.
 */

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining attempts before lockout */
  remaining: number;
  /** Milliseconds until the limit resets (if blocked) */
  retryAfterMs?: number;
  /** ISO timestamp token representing attempt inception for race-free failure tracking */
  attemptTime?: string;
}

export interface RateLimiter {
  /**
   * Check whether a key (IP, email, or composite) is currently rate-limited.
   */
  check(
    key: string,
    maxAttempts: number,
    windowMs: number,
  ): Promise<RateLimitResult>;

  /**
   * Atomically consume an attempt and check whether the request is allowed.
   * If max attempts exceeded, triggers lockout for lockoutMs.
   */
  consume(
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs: number,
  ): Promise<RateLimitResult>;

  /**
   * Record a verified authentication failure for the given key and attempt start time.
   * Compares attempt start time against the last successful login to eliminate in-flight erase races.
   */
  recordFailure(
    key: string,
    attemptTime: string,
    maxAttempts: number,
    lockoutMs: number,
  ): Promise<{ locked: boolean; remaining: number; retryAfterMs?: number }>;

  /**
   * Record a failed attempt for the given key.
   */
  increment(
    key: string,
    windowMs: number,
    maxAttempts?: number,
    lockoutMs?: number,
  ): Promise<void>;

  /**
   * Reset the rate limit for a key (e.g. after successful login).
   */
  reset(key: string): Promise<void>;
}
