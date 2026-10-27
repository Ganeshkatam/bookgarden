jest.mock("@/shared/core/database/client", () => ({
  supabase: {},
}));

jest.mock("@/modules/discovery/search/application/event-handlers/SearchAnalyticsHandler", () => ({
  SearchAnalyticsHandler: jest.fn().mockImplementation(() => ({
    handle: jest.fn(),
  })),
}));

jest.mock("@/modules/discovery/search/application/event-handlers", () => ({
  initializeSearchEventHandlers: jest.fn(),
}));

import { register } from "@/instrumentation";
import {
  getAuthRateLimitConfig,
  resetAuthRateLimitConfigCache,
  AUTH_RATE_LIMIT_DEFAULTS,
} from "./auth-rate-limit-config";

describe("Application Startup Instrumentation — Auth Rate-Limit Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_RUNTIME: "nodejs",
      NEXT_PUBLIC_SUPABASE_URL: originalEnv.NEXT_PUBLIC_SUPABASE_URL || "https://mock-ci.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-ci-anon-key",
    };
    resetAuthRateLimitConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetAuthRateLimitConfigCache();
  });

  describe("Valid and Missing Settings Lifecycle", () => {
    it("successfully boots application with default security configuration when variables are missing", async () => {
      delete process.env.MAX_LOGIN_ATTEMPTS;
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.LOCKOUT_DURATION_MS;
      delete process.env.MAX_IP_LOGIN_ATTEMPTS;

      await expect(register()).resolves.toBeUndefined();

      const config = getAuthRateLimitConfig();
      expect(config.maxLoginAttempts).toBe(AUTH_RATE_LIMIT_DEFAULTS.MAX_LOGIN_ATTEMPTS);
      expect(config.rateLimitWindowMs).toBe(AUTH_RATE_LIMIT_DEFAULTS.RATE_LIMIT_WINDOW_MS);
      expect(config.lockoutDurationMs).toBe(AUTH_RATE_LIMIT_DEFAULTS.LOCKOUT_DURATION_MS);
      expect(config.maxIpLoginAttempts).toBe(AUTH_RATE_LIMIT_DEFAULTS.MAX_IP_LOGIN_ATTEMPTS);
    });

    it("successfully boots application when valid custom environment values are supplied", async () => {
      process.env.MAX_LOGIN_ATTEMPTS = "8";
      process.env.RATE_LIMIT_WINDOW_MS = "600000"; // 10 minutes
      process.env.LOCKOUT_DURATION_MS = "1800000"; // 30 minutes
      process.env.MAX_IP_LOGIN_ATTEMPTS = "50";

      await expect(register()).resolves.toBeUndefined();

      const config = getAuthRateLimitConfig();
      expect(config.maxLoginAttempts).toBe(8);
      expect(config.rateLimitWindowMs).toBe(600000);
      expect(config.lockoutDurationMs).toBe(1800000);
      expect(config.maxIpLoginAttempts).toBe(50);
    });
  });

  describe("Fail-Fast Startup Error Handling", () => {
    it("fails startup initialization when MAX_LOGIN_ATTEMPTS is non-numeric", async () => {
      process.env.MAX_LOGIN_ATTEMPTS = "not-a-number";

      await expect(register()).rejects.toThrow(
        '[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be a valid integer, received: "not-a-number"',
      );
    });

    it("fails startup initialization when MAX_LOGIN_ATTEMPTS is out of bounds (< min)", async () => {
      process.env.MAX_LOGIN_ATTEMPTS = "0";

      await expect(register()).rejects.toThrow(
        "[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be between 1 and 20, received: 0",
      );
    });

    it("fails startup initialization when MAX_LOGIN_ATTEMPTS is out of bounds (> max)", async () => {
      process.env.MAX_LOGIN_ATTEMPTS = "25";

      await expect(register()).rejects.toThrow(
        "[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be between 1 and 20, received: 25",
      );
    });

    it("fails startup initialization when cross-field invariant is violated (lockout < window)", async () => {
      process.env.RATE_LIMIT_WINDOW_MS = "1800000"; // 30 min
      process.env.LOCKOUT_DURATION_MS = "900000"; // 15 min

      await expect(register()).rejects.toThrow(
        "[Security Configuration Error] LOCKOUT_DURATION_MS (900000ms) cannot be shorter than RATE_LIMIT_WINDOW_MS (1800000ms)",
      );
    });

    it("fails startup initialization when cross-field invariant is violated (ip limit < user limit)", async () => {
      process.env.MAX_LOGIN_ATTEMPTS = "10";
      process.env.MAX_IP_LOGIN_ATTEMPTS = "6";

      await expect(register()).rejects.toThrow(
        "[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS (6) cannot be less than MAX_LOGIN_ATTEMPTS (10)",
      );
    });
  });

  describe("Runtime Scoping", () => {
    it("skips server-side initialization when NEXT_RUNTIME is not nodejs", async () => {
      process.env.NEXT_RUNTIME = "edge";
      process.env.MAX_LOGIN_ATTEMPTS = "invalid-in-edge";

      await expect(register()).resolves.toBeUndefined();
    });
  });
});
