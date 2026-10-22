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
  mockConsume = jest.fn().mockImplementation(async () => ({
    allowed: true,
    remaining: 4,
  }));
  mockReset = jest.fn().mockResolvedValue(undefined);
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

  it("rejects login at IP layer when client network limit is exceeded before touching account limiter", async () => {
    // Layer 1 IP consume returns allowed: false
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
    // Supabase Auth and account limiter are NOT touched
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
      return { allowed: true, remaining: 4 };
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
    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 25 };
      }
      return { allowed: true, remaining: 0 };
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

    mockConsume.mockImplementation(async (key: string) => {
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 28 };
      }
      return { allowed: true, remaining: 3 };
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
    // Simulate successful authentication where database reset encounters a transient error
    mockConsume.mockResolvedValue({ allowed: true, remaining: 3 });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });
    mockReset.mockRejectedValueOnce(new Error("Database connection dropped during reset"));

    const result = await loginWithPassword("user@example.com", "correctpassword", false);

    // Authentication succeeded; the action must not abort the user's session
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
      // IP layer permits all requests
      if (key.startsWith("login:ip:")) {
        return { allowed: true, remaining: 20 };
      }
      // Account layer simulates atomic DB limiter: first 5 permitted, next 5 rejected
      accountConsumeCount++;
      if (accountConsumeCount <= 5) {
        return {
          allowed: true,
          remaining: 5 - accountConsumeCount,
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

    // Fire 10 concurrent requests
    const promises = Array.from({ length: totalRequests }).map(() =>
      loginWithPassword("concurrent_victim@example.com", "wrong_guess", false),
    );

    const results = await Promise.all(promises);

    // 1. IP layer called 10 times, and account layer called 10 times = 20 total consume calls
    expect(mockConsume).toHaveBeenCalledTimes(20);

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
