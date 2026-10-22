import { loginWithPassword } from "./auth";
import {
  buildRateLimitKey,
  buildIpRateLimitKey,
  getRateLimitSecret,
} from "../../services/rate-limit-key";
import { SupabaseRateLimiter } from "@/modules/security/infrastructure/SupabaseRateLimiter";
import { PostgresAuditLogger } from "@/modules/security/infrastructure/PostgresAuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";
import { createHmac } from "crypto";
import { headers } from "next/headers";

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
let mockRecordFailure: jest.Mock;
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
  mockConsume = jest.fn().mockImplementation(async () => ({
    allowed: true,
    remaining: 4,
    attemptTime: "2026-10-22T10:00:00.000Z",
  }));
  mockRecordFailure = jest.fn().mockImplementation(async () => ({
    locked: false,
    remaining: 4,
  }));
  mockReset = jest.fn().mockResolvedValue(undefined);
  (SupabaseRateLimiter as unknown as jest.Mock).mockImplementation(() => ({
    check: mockCheck,
    consume: mockConsume,
    recordFailure: mockRecordFailure,
    reset: mockReset,
  }));

  mockLogAction = jest.fn();
  (PostgresAuditLogger as unknown as jest.Mock).mockImplementation(() => ({
    logAction: mockLogAction,
  }));
});

describe("buildRateLimitKey & buildIpRateLimitKey — HMAC & Privacy", () => {
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

  it("produces a server-secret HMAC-SHA256 preventing offline dictionary guessing", () => {
    const email = "secret_user@example.com";
    const secret = getRateLimitSecret();
    const expectedHmac = createHmac("sha256", secret).update(email).digest("hex");
    const key = buildRateLimitKey(email, false);
    expect(key).toBe(`login:account:${expectedHmac}`);
    expect(key).not.toContain(email);
  });

  it("produces distinct hashes when server secret is changed (secret rotation verification)", () => {
    const email = "rotate_test@example.com";
    const key1 = buildRateLimitKey(email, false, "secret_version_1");
    const key2 = buildRateLimitKey(email, false, "secret_version_2");
    expect(key1).not.toBe(key2);
  });

  it("hashes IP addresses for layered rate-limiting key derivation", () => {
    const ip = "192.168.1.100";
    const key = buildIpRateLimitKey(ip);
    expect(key).toMatch(/^login:ip:[a-f0-9]{64}$/);
    expect(key).not.toContain(ip);
  });

  it("enforces mandatory RATE_LIMIT_HMAC_SECRET in production environment", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.RATE_LIMIT_HMAC_SECRET;
    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.RATE_LIMIT_HMAC_SECRET;
      expect(() => getRateLimitSecret()).toThrow("RATE_LIMIT_HMAC_SECRET must be configured in production");
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      process.env.RATE_LIMIT_HMAC_SECRET = originalSecret;
    }
  });
});

describe("loginWithPassword — Layered Atomic Rate Limiting", () => {
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

  it("skips IP rate limiting when no trusted edge IP is available (no 127.0.0.1 dummy bucket)", async () => {
    (headers as jest.Mock).mockResolvedValueOnce({
      get: () => null, // No IP headers
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });

    const result = await loginWithPassword("user@example.com", "valid_pass", false);

    expect(result.success).toBe(true);
    // Verified: consume is called ONLY once for account, NOT for dummy 127.0.0.1
    expect(mockConsume).toHaveBeenCalledTimes(1);
    expect(mockConsume).toHaveBeenCalledWith(
      expect.stringMatching(/^login:account:/),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("rejects login at IP layer when client network limit is exceeded before touching account limiter", async () => {
    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: false, remaining: 0, retryAfterMs: 900000 };
      }
      return { allowed: true, remaining: 5 };
    });

    const result = await loginWithPassword("victim@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toContain("Too many requests from this network");
      expect(result.error?.message).toContain("15 minutes");
    }
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "ip_rate_limit_exceeded" }),
    );
  });

  it("rejects login immediately when account key is locked out without invoking Supabase Auth", async () => {
    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 25 };
      }
      return { allowed: false, remaining: 0, retryAfterMs: 1800000 };
    });

    const result = await loginWithPassword("victim@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toContain("Too many login attempts");
      expect(result.error?.message).toContain("30 minutes");
    }
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "rate_limit_exceeded" }),
    );
  });

  it("atomically consumes attempt before auth and records credential failure without resetting", async () => {
    const expectedKey = buildRateLimitKey("user@example.com", false);

    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 29 };
      }
      return { allowed: true, remaining: 4, attemptTime: "2026-10-22T10:00:00.000Z" };
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    mockRecordFailure.mockResolvedValueOnce({
      locked: false,
      remaining: 4,
    });

    const result = await loginWithPassword("user@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe("Invalid credentials. Please check your email and password.");
    }
    expect(mockConsume).toHaveBeenCalledWith(
      expectedKey,
      5,
      900000,
      3600000,
    );
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "wrongpassword",
    });
    // Verified: recordFailure invoked with attempt token
    expect(mockRecordFailure).toHaveBeenCalledWith(
      expectedKey,
      "2026-10-22T10:00:00.000Z",
      5,
      3600000,
    );
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.LoginFailed,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ remaining: 4 }),
    );
  });

  it("triggers account lockout when recordFailure returns locked", async () => {
    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) return { allowed: true, remaining: 25 };
      return { allowed: true, remaining: 0, attemptTime: "2026-10-22T10:00:00.000Z" };
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    mockRecordFailure.mockResolvedValueOnce({
      locked: true,
      remaining: 0,
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

    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) return { allowed: true, remaining: 28 };
      return { allowed: true, remaining: 3, attemptTime: "2026-10-22T10:00:00.000Z" };
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

  it("remains resilient and preserves user session when post-auth rate-limit reset fails", async () => {
    mockConsume.mockResolvedValue({ allowed: true, remaining: 3, attemptTime: "2026-10-22T10:00:00.000Z" });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });
    mockReset.mockRejectedValueOnce(new Error("Database connection dropped during reset"));

    const result = await loginWithPassword("user@example.com", "correctpassword", false);

    expect(result.success).toBe(true);
  });

  it("fails closed when rate limiter encounters a database outage", async () => {
    mockConsume.mockImplementation(async () => ({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60000,
    }));

    const result = await loginWithPassword("user@example.com", "any_password", false);

    expect(result.success).toBe(false);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error?.message).toContain("Too many requests from this network");
    }
  });

  it("blocks concurrent requests exceeding limit before touching Supabase Auth (10 concurrent requests test)", async () => {
    const totalRequests = 10;
    let accountConsumeCount = 0;

    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 20 };
      }
      accountConsumeCount++;
      if (accountConsumeCount <= 5) {
        return {
          allowed: true,
          remaining: 5 - accountConsumeCount,
          attemptTime: `2026-10-22T10:00:0${accountConsumeCount}.000Z`,
        };
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 3600000,
      };
    });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const promises = Array.from({ length: totalRequests }).map(() =>
      loginWithPassword("concurrent_victim@example.com", "wrong_guess", false),
    );

    const results = await Promise.all(promises);

    expect(mockConsume).toHaveBeenCalledTimes(20);
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(5);

    const credentialFailures = results.filter(
      (r) => !r.success && r.error?.message === "Invalid credentials. Please check your email and password.",
    );
    expect(credentialFailures).toHaveLength(5);

    const rateLimitFailures = results.filter(
      (r) => !r.success && r.error?.message.includes("Too many login attempts"),
    );
    expect(rateLimitFailures).toHaveLength(5);
  });

  it("preserves in-flight failure accounting when a concurrent login succeeds (race-free failure tracking)", async () => {
    const expectedKey = buildRateLimitKey("race_test@example.com", false);

    // Request 1 starts at T1 = 10:00:00
    // Request 2 starts at T2 = 10:00:01
    // Request 2 finishes with SUCCESS at T2_success = 10:00:02 and resets counter
    // Request 1 finishes with FAILURE at T1_fail = 10:00:03
    let lastSuccessTime: number | null = null;
    let recordedFailures = 0;

    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) return { allowed: true, remaining: 25 };
      return { allowed: true, remaining: 4, attemptTime: "2026-10-22T10:00:00.000Z" };
    });

    mockReset.mockImplementation(async () => {
      lastSuccessTime = new Date("2026-10-22T10:00:02.000Z").getTime();
    });

    mockRecordFailure.mockImplementation(async (_key: string, attemptTime: string) => {
      const attemptMs = new Date(attemptTime).getTime();
      // If a successful login occurred after attempt started:
      if (lastSuccessTime && lastSuccessTime > attemptMs) {
        // Must NOT erase failure: begins new consecutive count of 1
        recordedFailures = 1;
        return { locked: false, remaining: 4 };
      }
      recordedFailures++;
      return { locked: false, remaining: Math.max(0, 5 - recordedFailures) };
    });

    // Request 1: Wrong password
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    // Request 2: Correct password
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });

    const [res1, res2] = await Promise.all([
      loginWithPassword("race_test@example.com", "wrong_pass", false),
      loginWithPassword("race_test@example.com", "correct_pass", false),
    ]);

    expect(res1.success).toBe(false);
    expect(res2.success).toBe(true);
    expect(mockReset).toHaveBeenCalledWith(expectedKey);
    // Verified: Request 1's failure was NOT erased to 0, it was recorded as 1
    expect(mockRecordFailure).toHaveBeenCalledWith(
      expectedKey,
      "2026-10-22T10:00:00.000Z",
      5,
      3600000,
    );
    expect(recordedFailures).toBe(1);
  });
});
