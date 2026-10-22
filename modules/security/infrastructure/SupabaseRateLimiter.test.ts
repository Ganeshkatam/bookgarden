import { SupabaseRateLimiter } from "./SupabaseRateLimiter";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock the admin client module to control what client is provided
jest.mock("@/shared/core/database/admin", () => ({
  createSupabaseAdminClient: jest.fn(() => mockSupabase),
}));

let mockRpc: jest.Mock;
let mockSupabase: any;

beforeEach(() => {
  mockRpc = jest.fn();
  mockSupabase = {
    rpc: mockRpc,
  };
});

describe("SupabaseRateLimiter — Atomic Rate Limiting Specification", () => {
  // ─── Acceptance Criterion 1: Exactly 5 attempts allowed, 6th denied & locked ───

  describe("AC-1: Threshold and Lockout Triggering", () => {
    it("permits attempts 1 through 5 and denies attempt 6 triggering lockout", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      // Simulate atomic PostgreSQL consume_rate_limit responses
      mockRpc
        .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 4, retry_after_ms: 0 }], error: null }) // Attempt 1
        .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 3, retry_after_ms: 0 }], error: null }) // Attempt 2
        .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 2, retry_after_ms: 0 }], error: null }) // Attempt 3
        .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 1, retry_after_ms: 0 }], error: null }) // Attempt 4
        .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 0, retry_after_ms: 0 }], error: null }) // Attempt 5
        .mockResolvedValueOnce({ data: [{ allowed: false, remaining: 0, retry_after_ms: 3600000 }], error: null }); // Attempt 6

      // Attempts 1 to 5
      for (let i = 1; i <= 5; i++) {
        const result = await limiter.consume("login:ip:test@example.com", 5, 900000, 3600000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i);
      }

      // Attempt 6: strictly denied, triggers lockout
      const result6 = await limiter.consume("login:ip:test@example.com", 5, 900000, 3600000);
      expect(result6.allowed).toBe(false);
      expect(result6.remaining).toBe(0);
      expect(result6.retryAfterMs).toBe(3600000);

      expect(mockRpc).toHaveBeenCalledTimes(6);
      expect(mockRpc).toHaveBeenLastCalledWith("consume_rate_limit", {
        p_key: "login:ip:test@example.com",
        p_max_attempts: 5,
        p_window_seconds: 900,
        p_lockout_seconds: 3600,
      });
    });
  });

  // ─── Acceptance Criterion 2: Concurrency & Atomic Row Locking ───

  describe("AC-2: Concurrency Safety", () => {
    it("serializes concurrent requests without exceeding threshold", async () => {
      // Simulate PostgreSQL row-level lock (FOR UPDATE): stateful mock
      let currentAttempts = 0;
      const maxAttempts = 5;
      const lockoutMs = 3600000;

      mockRpc.mockImplementation(async (name: string) => {
        if (name === "consume_rate_limit") {
          currentAttempts++;
          if (currentAttempts <= maxAttempts) {
            return {
              data: [{ allowed: true, remaining: maxAttempts - currentAttempts, retry_after_ms: 0 }],
              error: null,
            };
          } else {
            return {
              data: [{ allowed: false, remaining: 0, retry_after_ms: lockoutMs }],
              error: null,
            };
          }
        }
        return { data: null, error: new Error("Unknown RPC") };
      });

      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      // Launch 10 concurrent requests simultaneously
      const results = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          limiter.consume("login:concurrent:test", 5, 900000, 3600000),
        ),
      );

      const allowedCount = results.filter((r) => r.allowed).length;
      const deniedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(5);
      expect(deniedCount).toBe(5);
      expect(currentAttempts).toBe(10);
    });
  });

  // ─── Acceptance Criterion 3: Lockout & Window Expiry ───

  describe("AC-3: Expiry Semantics", () => {
    it("permits fresh attempts when lockout expires within an unexpired window", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      // 1. Lockout is currently active
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: false, remaining: 0, retry_after_ms: 120000 }],
        error: null,
      });

      const lockedResult = await limiter.consume("login:expiry:test", 5, 900000, 300000);
      expect(lockedResult.allowed).toBe(false);
      expect(lockedResult.retryAfterMs).toBe(120000);

      // 2. Lockout has expired (served 5 min), but 15-min window has not expired
      // PostgreSQL function resets counter and starts new window: attempt allowed, remaining 4
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, remaining: 4, retry_after_ms: 0 }],
        error: null,
      });

      const postLockoutResult = await limiter.consume("login:expiry:test", 5, 900000, 300000);
      expect(postLockoutResult.allowed).toBe(true);
      expect(postLockoutResult.remaining).toBe(4);
    });

    it("resets attempt counter when window expires naturally without lockout", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      // In-window check: 2 remaining
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, remaining: 2, retry_after_ms: 0 }],
        error: null,
      });
      const r1 = await limiter.check("login:window:test", 5, 900000);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      // After 15 minutes: window has expired, full quota available
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, remaining: 5, retry_after_ms: 0 }],
        error: null,
      });
      const r2 = await limiter.check("login:window:test", 5, 900000);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(5);
    });
  });

  // ─── Acceptance Criterion 4: Fail-Closed Behavior on Database Failure ───

  describe("AC-4: Fail-Closed Error Handling", () => {
    it("fails closed on check when database RPC returns an error", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "connection timeout to postgres" },
      });

      const result = await limiter.check("login:fail:test", 5, 900000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(60000);
      expect(result.reason).toBe("service_unavailable");
    });

    it("fails closed on consume when database throws an exception", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockRejectedValueOnce(new Error("Network connection dropped"));

      const result = await limiter.consume("login:fail:test", 5, 900000, 3600000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(60000);
      expect(result.reason).toBe("service_unavailable");
    });

    it("fails closed on empty data return", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await limiter.consume("login:fail:test", 5, 900000, 3600000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBe("service_unavailable");
    });

    it("fails closed on consumeBudget when RPC returns an error", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "function internal.consume_request_budget() does not exist" },
      });

      const result = await limiter.consumeBudget("login:ip:fail", 30, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(60000);
      expect(result.reason).toBe("service_unavailable");
    });
  });

  // ─── Acceptance Criterion 5: State Isolation & Manipulation Protection ───

  describe("AC-5: Read-Only Inspection and State Reset", () => {
    it("check does not mutate state or consume attempts", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValue({
        data: [{ allowed: true, remaining: 3, retry_after_ms: 0 }],
        error: null,
      });

      const check1 = await limiter.check("login:readonly:test", 5, 900000);
      const check2 = await limiter.check("login:readonly:test", 5, 900000);

      expect(check1.remaining).toBe(3);
      expect(check2.remaining).toBe(3);
      expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
        p_key: "login:readonly:test",
        p_max_attempts: 5,
        p_window_seconds: 900,
      });
    });

    it("consume returns attemptId when provided by consume_rate_limit RPC", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: [
          {
            allowed: true,
            remaining: 4,
            retry_after_ms: 0,
            attempt_time: "2026-10-22T12:00:00.000Z",
            attempt_id: "a0000000-0000-0000-0000-000000000001",
          },
        ],
        error: null,
      });

      const res = await limiter.consume("login:account:test", 5, 900000, 3600000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
      expect(res.attemptId).toBe("a0000000-0000-0000-0000-000000000001");
      expect(res.attemptTime).toBe("2026-10-22T12:00:00.000Z");
    });

    it("consumeBudget invokes consume_request_budget RPC and returns allowed status with remaining window", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, remaining: 29, retry_after_ms: 0 }],
        error: null,
      });

      const res = await limiter.consumeBudget("login:ip:192.168.1.1", 30, 60000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(29);
      expect(mockRpc).toHaveBeenCalledWith("consume_request_budget", {
        p_key: "login:ip:192.168.1.1",
        p_max_requests: 30,
        p_window_seconds: 60,
      });
    });

    it("consumeBudget returns retryAfterMs when budget is exhausted", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: false, remaining: 0, retry_after_ms: 45000 }],
        error: null,
      });

      const res = await limiter.consumeBudget("login:ip:192.168.1.1", 30, 60000);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfterMs).toBe(45000);
    });

    it("consumeBudget fails closed when RPC encounters an error", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "database timeout" },
      });

      const res = await limiter.consumeBudget("login:ip:192.168.1.1", 30, 60000);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfterMs).toBe(60000);
    });

    it("reset invokes record_login_success RPC with attemptId to complete attempt and reset counter", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await limiter.reset("login:reset:test", "a0000000-0000-0000-0000-000000000001");

      expect(mockRpc).toHaveBeenCalledWith("record_login_success", {
        p_key: "login:reset:test",
        p_attempt_id: "a0000000-0000-0000-0000-000000000001",
      });
    });

    it("releaseInFlight invokes release_in_flight_attempt RPC with attemptId to release slot", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);

      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await limiter.releaseInFlight("login:release:test", "a0000000-0000-0000-0000-000000000001");

      expect(mockRpc).toHaveBeenCalledWith("release_in_flight_attempt", {
        p_key: "login:release:test",
        p_attempt_id: "a0000000-0000-0000-0000-000000000001",
      });
    });

    it("recordFailure invokes record_login_failure RPC with attemptId and returns result", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);
      const attemptId = "a0000000-0000-0000-0000-000000000001";

      mockRpc.mockResolvedValueOnce({
        data: [{ locked: false, attempts: 2, remaining: 3, retry_after_ms: 0 }],
        error: null,
      });

      const result = await limiter.recordFailure(
        "login:fail:test",
        attemptId,
        5,
        3600000,
      );

      expect(mockRpc).toHaveBeenCalledWith("record_login_failure", {
        p_key: "login:fail:test",
        p_attempt_id: attemptId,
        p_max_attempts: 5,
        p_lockout_seconds: 3600,
      });
      expect(result.locked).toBe(false);
      expect(result.remaining).toBe(3);
    });

    it("recordFailure handles lockout and returns retryAfterMs", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);
      const attemptId = "a0000000-0000-0000-0000-000000000001";

      mockRpc.mockResolvedValueOnce({
        data: [{ locked: true, attempts: 5, remaining: 0, retry_after_ms: 3600000 }],
        error: null,
      });

      const result = await limiter.recordFailure("login:fail:test", attemptId, 5, 3600000);

      expect(result.locked).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(3600000);
    });

    it("recordFailure fails closed if RPC returns error", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);
      const attemptId = "a0000000-0000-0000-0000-000000000001";

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "database offline" },
      });

      const result = await limiter.recordFailure("login:fail:test", attemptId, 5, 3600000);

      expect(result.locked).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(60000);
    });

    it("duplicate recordFailure calls pass identical attemptId for database-level idempotency", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);
      const attemptId = "a0000000-0000-0000-0000-000000000001";

      mockRpc
        .mockResolvedValueOnce({
          data: [{ locked: false, attempts: 1, remaining: 4, retry_after_ms: 0 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ locked: false, attempts: 1, remaining: 4, retry_after_ms: 0 }],
          error: null,
        });

      const res1 = await limiter.recordFailure("login:fail:dup", attemptId, 5, 3600000);
      const res2 = await limiter.recordFailure("login:fail:dup", attemptId, 5, 3600000);

      expect(res1.remaining).toBe(4);
      expect(res2.remaining).toBe(4);
      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockRpc).toHaveBeenNthCalledWith(1, "record_login_failure", {
        p_key: "login:fail:dup",
        p_attempt_id: attemptId,
        p_max_attempts: 5,
        p_lockout_seconds: 3600,
      });
      expect(mockRpc).toHaveBeenNthCalledWith(2, "record_login_failure", {
        p_key: "login:fail:dup",
        p_attempt_id: attemptId,
        p_max_attempts: 5,
        p_lockout_seconds: 3600,
      });
    });

    it("consumeBudget handles simultaneous requests at threshold correctly", async () => {
      const limiter = new SupabaseRateLimiter(mockSupabase as unknown as SupabaseClient);
      let consumed = 0;
      const budget = 3;

      mockRpc.mockImplementation(async (name: string) => {
        if (name === "consume_request_budget") {
          consumed++;
          if (consumed <= budget) {
            return {
              data: [{ allowed: true, remaining: budget - consumed, retry_after_ms: 0 }],
              error: null,
            };
          } else {
            return {
              data: [{ allowed: false, remaining: 0, retry_after_ms: 45000 }],
              error: null,
            };
          }
        }
        return { data: null, error: new Error("Unexpected RPC") };
      });

      const promises = Array.from({ length: 6 }).map(() =>
        limiter.consumeBudget("login:ip:concurrent_budget", budget, 60000),
      );
      const results = await Promise.all(promises);

      const allowed = results.filter((r) => r.allowed);
      const throttled = results.filter((r) => !r.allowed);

      expect(allowed).toHaveLength(3);
      expect(throttled).toHaveLength(3);
      expect(throttled[0].retryAfterMs).toBe(45000);
    });
  });
});
