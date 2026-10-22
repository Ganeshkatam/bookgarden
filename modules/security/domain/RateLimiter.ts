/**
 * Rate Limiter — Domain Port
 *
 * Defines the contract for rate limiting authentication attempts and request budgeting.
 * Implementations can use Postgres, Redis, or any other backing store.
 */

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining attempts or requests before lockout/exhaustion */
  remaining: number;
  /** Milliseconds until the limit resets (if blocked) */
  retryAfterMs?: number;
  /** Unique attempt ID for tracking active in-flight requests */
  attemptId?: string;
  /** ISO timestamp token representing attempt inception for race-free failure tracking */
  attemptTime?: string;
  /** Failure reason when request is blocked */
  reason?: "rate_limited" | "service_unavailable";
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
   * Atomically consume from a sliding request budget (used for IP request throttling).
   * Does not require in-flight tracking or failure recording. Returns exact remaining window duration.
   */
  consumeBudget(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult>;

  /**
   * Atomically claim an in-flight attempt slot for account brute-force protection.
   * If max attempts exceeded, triggers lockout for lockoutMs.
   */
  consume(
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs: number,
  ): Promise<RateLimitResult>;

  /**
   * Record a verified authentication failure for the given key and specific attempt ID.
   * Completes the matching attempt and updates consecutive failure counter.
   */
  recordFailure(
    key: string,
    attemptId: string,
    maxAttempts: number,
    lockoutMs: number,
  ): Promise<{ locked: boolean; remaining: number; retryAfterMs?: number }>;

  /**
   * Record a failed attempt for the given key (backward compatibility).
   */
  increment(
    key: string,
    windowMs: number,
    maxAttempts?: number,
    lockoutMs?: number,
  ): Promise<void>;

  /**
   * Reset consecutive failures for a key upon verified authentication, completing the active attempt.
   */
  reset(key: string, attemptId?: string): Promise<void>;

  /**
   * Release an in-flight attempt slot if an exception occurs before auth completes.
   */
  releaseInFlight(key: string, attemptId?: string): Promise<void>;
}
