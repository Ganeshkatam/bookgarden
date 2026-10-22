import { loginWithPassword } from "./auth";
import { SupabaseRateLimiter } from "@/modules/security/infrastructure/SupabaseRateLimiter";
import { PostgresAuditLogger } from "@/modules/security/infrastructure/PostgresAuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";

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

describe("loginWithPassword — Atomic Rate Limiting Integration", () => {
  it("rejects login immediately when key is already locked out", async () => {
    mockCheck.mockResolvedValueOnce({
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
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "rate_limit_exceeded" }),
    );
  });

  it("consumes an attempt atomically on credential failure and logs remaining count", async () => {
    mockCheck.mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    mockConsume.mockResolvedValueOnce({
      allowed: true,
      remaining: 4,
    });

    const result = await loginWithPassword("user@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe("Invalid credentials. Please check your email and password.");
    }
    expect(mockConsume).toHaveBeenCalledWith(
      "login:192.168.1.100:user@example.com",
      5,
      900000,
      3600000,
    );
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.LoginFailed,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ remaining: 4 }),
    );
  });

  it("triggers account lockout on the 6th failed attempt", async () => {
    mockCheck.mockResolvedValueOnce({
      allowed: true,
      remaining: 1,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    // 6th failed attempt returns allowed: false from atomic consume
    mockConsume.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 3600000,
    });

    const result = await loginWithPassword("user@example.com", "wrongpassword", false);

    expect(result.success).toBe(false);
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.AccountLocked,
      expect.objectContaining({ ipAddress: "192.168.1.100" }),
      expect.objectContaining({ reason: "max_attempts_reached" }),
    );
  });

  it("resets rate limiter on successful authentication", async () => {
    mockCheck.mockResolvedValueOnce({
      allowed: true,
      remaining: 3,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      error: null,
    });

    const result = await loginWithPassword("valid@example.com", "correctpassword", false);

    expect(result.success).toBe(true);
    expect(mockReset).toHaveBeenCalledWith("login:192.168.1.100:valid@example.com");
    expect(mockLogAction).toHaveBeenCalledWith(
      SecurityAction.LoginSuccess,
      expect.objectContaining({ actorId: "00000000-0000-0000-0000-000000000001" }),
      expect.objectContaining({ email: "valid@example.com" }),
    );
  });
});
