import { loginWithPassword } from "./auth";
import { buildRateLimitKey } from "../../services/rate-limit-key";
import { SupabaseRateLimiter } from "@/modules/security/infrastructure/SupabaseRateLimiter";
import { PostgresAuditLogger } from "@/modules/security/infrastructure/PostgresAuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";
import { createHash } from "crypto";

// Mock dependencies
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: (name: string) => {
      if (name === "x-forwarded-for") return "192.168.1.100";
      if (name === "user-agent") return "Mozilla/5.0 TestBrowser";
      return null;
    },
  })),
}));

jest.mock("@/shared/core/database/server", () => ({
  createSupabaseServerClient: jest.fn(async () => mockSupabaseClient),
}));

jest.mock("@/modules/security/infrastructure/SupabaseRateLimiter");
jest.mock("@/modules/security/infrastructure/PostgresAuditLogger");

let mockSupabaseClient: any;
let mockSignInWithPassword: jest.Mock;
let mockCheck: jest.Mock;
let mockConsume: jest.Mock;
let mockReset: jest.Mock;
let mockLogAction: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockSignInWithPassword = jest.fn();
  mockSupabaseClient = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  };

  mockCheck = jest.fn();
  mockConsume = jest.fn();
  mockReset = jest.fn();
  (SupabaseRateLimiter as unknown as jest.Mock).mockImplementation(() => ({
    check: mockCheck,
    consume: mockConsume,
    reset: mockReset,
  }));

  mockLogAction = jest.fn();
  (PostgresAuditLogger as unknown as jest.Mock).mockImplementation(() => ({
    logAction: mockLogAction,
  }));
});

describe("buildRateLimitKey — Key Construction & Privacy", () => {
  it("normalizes email by trimming whitespace and lowercasing", () => {
    const key1 = buildRateLimitKey("  User.Test@Example.COM  ", false);
    const key2 = buildRateLimitKey("user.test@example.com", false);
    expect(key1).toBe(key2);
  });

  it("normalizes phone numbers by stripping non-digit non-plus characters", () => {
    const key1 = buildRateLimitKey("+1 (555) 123-4567", true);
    const key2 = buildRateLimitKey("+15551234567", true);
    expect(key1).toBe(key2);
  });

  it("produces a SHA-256 hash preventing raw PII persistence", () => {
    const email = "secret_user@example.com";
    const expectedHash = createHash("sha256").update(email).digest("hex");
    const key = buildRateLimitKey(email, false);
    expect(key).toBe(`login:account:${expectedHash}`);
    expect(key).not.toContain(email);
  });
});

describe("loginWithPassword — Atomic Pre-Authentication Rate Limiting", () => {
  it("fails fast on empty or invalid input before touching rate limiter or auth", async () => {
    const result1 = await loginWithPassword("", "password", false);
    expect(result1.success).toBe(false);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();

    const result2 = await loginWithPassword("user@example.com", "", false);
    expect(result2.success).toBe(false);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects login immediately when key is locked out without invoking Supabase Auth", async () => {
    mockConsume.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1800000, // 30 minutes
    });

    const result = await loginWithPassword("victim@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toContain("Too many login attempts");
      expect(result.error?.message).toContain("30 minutes");
    }
    // Supabase Auth MUST NOT be invoked when rate check is denied
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "rate_limit_exceeded" }),
    );
  });

  it("atomically consumes attempt before auth and records credential failure without resetting", async () => {
    const expectedKey = buildRateLimitKey("user@example.com", false);

    // Attempt 1 allowed
    mockConsume.mockResolvedValueOnce({
      allowed: true,
      remaining: 4,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await loginWithPassword("user@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe("Invalid credentials. Please check your email and password.");
    }
    // Verify consume was called with expected key and thresholds
    expect(mockConsume).toHaveBeenCalledWith(
      expectedKey,
      5,
      900000,
      3600000,
    );
    // Verify signInWithPassword was called with normalized email
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "wrongpassword",
    });
    // Rate limit must NOT be reset on failure
    expect(mockReset).not.toHaveBeenCalled();
    // Audit log records login failure with remaining count
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.LoginFailed,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ remaining: 4 }),
    );
  });

  it("triggers account lockout on the 5th failed attempt (remaining: 0)", async () => {
    // 5th attempt allowed to try, but remaining drops to 0
    mockConsume.mockResolvedValueOnce({
      allowed: true,
      remaining: 0,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await loginWithPassword("user@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "max_attempts_reached" }),
    );
  });

  it("resets rate limiter on successful authentication so legitimate logins do not deplete failure budget", async () => {
    const expectedKey = buildRateLimitKey("valid@example.com", false);

    mockConsume.mockResolvedValueOnce({
      allowed: true,
      remaining: 3,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });

    const result = await loginWithPassword("valid@example.com", "correctpassword", false);

    expect(result.success).toBe(true);
    expect(mockReset).toHaveBeenCalledWith(expectedKey);
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.LoginSuccess,
      expect.objectContaining({ actorId: "00000000-0000-0000-0000-000000000001" }),
      expect.objectContaining({ email: "valid@example.com" }),
    );
  });

  it("fails closed when rate limiter encounters a database outage", async () => {
    // SupabaseRateLimiter returns allowed: false on DB outage
    mockConsume.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60000,
    });

    const result = await loginWithPassword("user@example.com", "any_password", false);

    expect(result.success).toBe(false);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error?.message).toContain("Too many login attempts");
    }
  });

  it("blocks concurrent requests exceeding limit before touching Supabase Auth (10 concurrent requests test)", async () => {
    const totalRequests = 10;
    let consumeCallCount = 0;

    // Simulate atomic database limiter under concurrency:
    // First 5 requests are permitted (allowed: true, remaining: 4, 3, 2, 1, 0)
    // Subsequent 5 requests are rejected (allowed: false, remaining: 0, retryAfterMs: 3600000)
    mockConsume.mockImplementation(async () => {
      consumeCallCount++;
      if (consumeCallCount <= 5) {
        return {
          allowed: true,
          remaining: 5 - consumeCallCount,
        };
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 3600000,
      };
    });

    // Supabase Auth returns invalid credentials for all that reach it
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    // Fire 10 concurrent requests
    const promises = Array.from({ length: totalRequests }).map(() =>
      loginWithPassword("concurrent_victim@example.com", "wrong_guess", false),
    );

    const results = await Promise.all(promises);

    // 1. All 10 requests must have called atomic consume
    expect(mockConsume).toHaveBeenCalledTimes(10);

    // 2. EXACTLY 5 requests must have been allowed to reach Supabase Auth
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(5);

    // 3. The 5 allowed requests failed due to invalid credentials
    const credentialFailures = results.filter(
      (r) => !r.success && r.error?.message === "Invalid credentials. Please check your email and password.",
    );
    expect(credentialFailures).toHaveLength(5);

    // 4. The 5 excess requests failed due to rate limiting BEFORE reaching Supabase Auth
    const rateLimitFailures = results.filter(
      (r) => !r.success && r.error?.message.includes("Too many login attempts"),
    );
    expect(rateLimitFailures).toHaveLength(5);
  });
});
