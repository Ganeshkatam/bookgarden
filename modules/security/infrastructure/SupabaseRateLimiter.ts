import { SupabaseClient } from "@supabase/supabase-js";
import { RateLimiter, RateLimitResult } from "../domain/RateLimiter";
import { createSupabaseAdminClient } from "@/shared/core/database/admin";

interface RateLimitRpcRow {
  allowed: boolean;
  remaining: number;
  retry_after_ms: number | string | bigint;
  attempt_id?: string;
  attempt_time?: string;
}

/**
 * PostgreSQL-backed atomic rate limiter and request-rate budgeter.
 *
 * Backed by internal schema tables and atomic capability RPCs:
 * - public.consume_request_budget: sliding/fixed request budget for IP throttling (Issue 3)
 * - public.consume_rate_limit: claims unique attempt_id under FOR UPDATE row lock (Issue 2)
 * - public.record_login_failure: completes specific matching attempt and records consecutive failure
 * - public.record_login_success: completes specific matching attempt and resets consecutive failures
 * - public.release_in_flight_attempt: safely releases specific in-flight attempt on exceptions
 * - public.check_rate_limit: read-only status check
 *
 * Implements strict fail-closed semantics: if the database is unreachable
 * or returns an RPC error, requests are denied with a safe retry-after backoff.
 */
export class SupabaseRateLimiter implements RateLimiter {
  constructor(private readonly supabase?: SupabaseClient) {}

  private getClient(): SupabaseClient {
    try {
      return createSupabaseAdminClient();
    } catch {
      if (this.supabase) {
        return this.supabase;
      }
      throw new Error(
        "[SupabaseRateLimiter] Neither admin client nor fallback Supabase client is available.",
      );
    }
  }

  /**
   * Atomically consumes from a sliding request budget (used for IP request throttling).
   * Returns exact remaining window duration in milliseconds when budget is exhausted.
   */
  async consumeBudget(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    try {
      const client = this.getClient();
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

      const { data, error } = await client.rpc("consume_request_budget", {
        p_key: key,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      });

      if (error) {
        console.error("[SupabaseRateLimiter.consumeBudget] Database RPC error, failing closed:", error);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
      if (!row) {
        console.error("[SupabaseRateLimiter.consumeBudget] No data returned from RPC, failing closed");
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const allowed = Boolean(row.allowed);
      return {
        allowed,
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
        reason: allowed ? undefined : "rate_limited",
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.consumeBudget] Unexpected exception, failing closed:", err);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
        reason: "service_unavailable",
      };
    }
  }

  /**
   * Read-only inspection of rate-limit state without incrementing attempt counter.
   * Fails closed if the database operation fails.
   */
  async check(
    key: string,
    maxAttempts: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    try {
      const client = this.getClient();
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

      const { data, error } = await client.rpc("check_rate_limit", {
        p_key: key,
        p_max_attempts: maxAttempts,
        p_window_seconds: windowSeconds,
      });

      if (error) {
        console.error("[SupabaseRateLimiter.check] Database RPC error, failing closed:", error);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
      if (!row) {
        console.error("[SupabaseRateLimiter.check] No data returned from RPC, failing closed");
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const allowed = Boolean(row.allowed);
      return {
        allowed,
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
        reason: allowed ? undefined : "rate_limited",
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.check] Unexpected exception, failing closed:", err);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
        reason: "service_unavailable",
      };
    }
  }

  /**
   * Atomically claims an in-flight attempt slot with a unique attemptId under exclusive row lock.
   * Fails closed if the database operation fails.
   */
  async consume(
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs: number,
  ): Promise<RateLimitResult> {
    try {
      const client = this.getClient();
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const lockoutSeconds = Math.max(1, Math.ceil(lockoutMs / 1000));

      const { data, error } = await client.rpc("consume_rate_limit", {
        p_key: key,
        p_max_attempts: maxAttempts,
        p_window_seconds: windowSeconds,
        p_lockout_seconds: lockoutSeconds,
      });

      if (error) {
        console.error("[SupabaseRateLimiter.consume] Database RPC error, failing closed:", error);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
      if (!row) {
        console.error("[SupabaseRateLimiter.consume] No data returned from RPC, failing closed");
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
          reason: "service_unavailable",
        };
      }

      const allowed = Boolean(row.allowed);
      return {
        allowed,
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
        attemptId: row.attempt_id ? String(row.attempt_id) : undefined,
        attemptTime: row.attempt_time ? String(row.attempt_time) : undefined,
        reason: allowed ? undefined : "rate_limited",
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.consume] Unexpected exception, failing closed:", err);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
        reason: "service_unavailable",
      };
    }
  }

  /**
   * Records an authentication failure for a specific matching attemptId.
   */
  async recordFailure(
    key: string,
    attemptId: string,
    maxAttempts: number,
    lockoutMs: number,
  ): Promise<{ locked: boolean; remaining: number; retryAfterMs?: number }> {
    try {
      const client = this.getClient();
      const lockoutSeconds = Math.max(1, Math.ceil(lockoutMs / 1000));

      const { data, error } = await client.rpc("record_login_failure", {
        p_key: key,
        p_attempt_id: attemptId,
        p_max_attempts: maxAttempts,
        p_lockout_seconds: lockoutSeconds,
      });

      if (error) {
        console.error("[SupabaseRateLimiter.recordFailure] RPC error, failing closed:", error);
        return { locked: true, remaining: 0, retryAfterMs: 60000 };
      }

      const row = (Array.isArray(data) ? data[0] : data) as any;
      if (!row) {
        return { locked: false, remaining: 0 };
      }

      return {
        locked: Boolean(row.locked),
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.recordFailure] Unexpected exception, failing closed:", err);
      return { locked: true, remaining: 0, retryAfterMs: 60000 };
    }
  }

  /**
   * Backward-compatible increment: calls consume with default/supplied parameters.
   */
  async increment(
    key: string,
    windowMs: number,
    maxAttempts = 5,
    lockoutMs = 3600000,
  ): Promise<void> {
    await this.consume(key, maxAttempts, windowMs, lockoutMs);
  }

  /**
   * Resets consecutive failures for a key upon successful authentication, completing matching attempt.
   */
  async reset(key: string, attemptId?: string): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc("record_login_success", {
        p_key: key,
        p_attempt_id: attemptId || null,
      });
      if (error) {
        console.error("[SupabaseRateLimiter.reset] Error resetting rate limit:", error);
      }
    } catch (err) {
      console.error("[SupabaseRateLimiter.reset] Unexpected exception resetting rate limit:", err);
    }
  }

  /**
   * Releases a specific in-flight attempt slot if an exception occurs before auth completes.
   */
  async releaseInFlight(key: string, attemptId?: string): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc("release_in_flight_attempt", {
        p_key: key,
        p_attempt_id: attemptId || null,
      });
      if (error) {
        console.error("[SupabaseRateLimiter.releaseInFlight] Error releasing in-flight slot:", error);
      }
    } catch (err) {
      console.error("[SupabaseRateLimiter.releaseInFlight] Unexpected exception releasing in-flight slot:", err);
    }
  }
}
