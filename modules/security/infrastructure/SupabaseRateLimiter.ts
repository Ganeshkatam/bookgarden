import { SupabaseClient } from "@supabase/supabase-js";
import { RateLimiter, RateLimitResult } from "../domain/RateLimiter";
import { createSupabaseAdminClient } from "@/shared/core/database/admin";

interface RateLimitRpcRow {
  allowed: boolean;
  remaining: number;
  retry_after_ms: number | string | bigint;
}

/**
 * PostgreSQL-backed atomic rate limiter.
 *
 * Backed by internal.rate_limits and atomic capability RPCs:
 * - public.consume_rate_limit: atomic check + increment + lockout trigger under row lock (FOR UPDATE)
 * - public.check_rate_limit: read-only status check
 * - public.reset_rate_limit: deletes rate limit record on successful authentication
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
        };
      }

      const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
      if (!row) {
        console.error("[SupabaseRateLimiter.check] No data returned from RPC, failing closed");
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
        };
      }

      return {
        allowed: Boolean(row.allowed),
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.check] Unexpected exception, failing closed:", err);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
      };
    }
  }

  /**
   * Atomically consumes one attempt under exclusive row lock.
   * If attempts reach or exceed maxAttempts, triggers lockout for lockoutMs.
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
        };
      }

      const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
      if (!row) {
        console.error("[SupabaseRateLimiter.consume] No data returned from RPC, failing closed");
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 60000,
        };
      }

      return {
        allowed: Boolean(row.allowed),
        remaining: Number(row.remaining),
        retryAfterMs: Number(row.retry_after_ms) > 0 ? Number(row.retry_after_ms) : undefined,
      };
    } catch (err) {
      console.error("[SupabaseRateLimiter.consume] Unexpected exception, failing closed:", err);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
      };
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
   * Resets the rate limit for a key upon successful authentication.
   */
  async reset(key: string): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc("reset_rate_limit", {
        p_key: key,
      });
      if (error) {
        console.error("[SupabaseRateLimiter.reset] Error resetting rate limit:", error);
      }
    } catch (err) {
      console.error("[SupabaseRateLimiter.reset] Unexpected exception resetting rate limit:", err);
    }
  }
}
