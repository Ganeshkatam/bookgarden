import {
  resolveAuthRateLimitConfig,
  getAuthRateLimitConfig,
  resetAuthRateLimitConfigCache,
  AUTH_RATE_LIMIT_DEFAULTS,
  AUTH_RATE_LIMIT_BOUNDS,
} from "./auth-rate-limit-config";

describe("auth-rate-limit-config — Server-Side Security Configuration", () => {
  beforeEach(() => {
    resetAuthRateLimitConfigCache();
  });

  describe("Baseline Defaults", () => {
    it("returns hardened baseline defaults when environment variables are omitted", () => {
      const config = resolveAuthRateLimitConfig({
        NODE_ENV: "development"
      });

      expect(config.maxLoginAttempts).toBe(5);
      expect(config.rateLimitWindowMs).toBe(15 * 60 * 1000); // 900,000 ms (15 min)
      expect(config.lockoutDurationMs).toBe(60 * 60 * 1000); // 3,600,000 ms (1 hour)
      expect(config.maxIpLoginAttempts).toBe(30);

      expect(config.maxLoginAttempts).toBe(AUTH_RATE_LIMIT_DEFAULTS.MAX_LOGIN_ATTEMPTS);
      expect(config.rateLimitWindowMs).toBe(AUTH_RATE_LIMIT_DEFAULTS.RATE_LIMIT_WINDOW_MS);
      expect(config.lockoutDurationMs).toBe(AUTH_RATE_LIMIT_DEFAULTS.LOCKOUT_DURATION_MS);
      expect(config.maxIpLoginAttempts).toBe(AUTH_RATE_LIMIT_DEFAULTS.MAX_IP_LOGIN_ATTEMPTS);
    });

    it("treats empty string environment variables as omitted and applies defaults", () => {
      const config = resolveAuthRateLimitConfig({
        MAX_LOGIN_ATTEMPTS: "   ",
        RATE_LIMIT_WINDOW_MS: "",
        LOCKOUT_DURATION_MS: "",
        MAX_IP_LOGIN_ATTEMPTS: " ",
        NODE_ENV: "development"
      });

      expect(config.maxLoginAttempts).toBe(5);
      expect(config.rateLimitWindowMs).toBe(900000);
      expect(config.lockoutDurationMs).toBe(3600000);
      expect(config.maxIpLoginAttempts).toBe(30);
    });
  });

  describe("Valid Custom Overrides", () => {
    it("accepts valid custom overrides within bounds and preserves relationships", () => {
      const config = resolveAuthRateLimitConfig({
        MAX_LOGIN_ATTEMPTS: "3",
        RATE_LIMIT_WINDOW_MS: "600000", // 10 min
        LOCKOUT_DURATION_MS: "1800000", // 30 min
        MAX_IP_LOGIN_ATTEMPTS: "20",
        NODE_ENV: "development"
      });

      expect(config.maxLoginAttempts).toBe(3);
      expect(config.rateLimitWindowMs).toBe(600000);
      expect(config.lockoutDurationMs).toBe(1800000);
      expect(config.maxIpLoginAttempts).toBe(20);
    });

    it("trims whitespace from environment string values", () => {
      const config = resolveAuthRateLimitConfig({
        MAX_LOGIN_ATTEMPTS: "  10  ",
        RATE_LIMIT_WINDOW_MS: "  900000  ",
        LOCKOUT_DURATION_MS: "  3600000  ",
        MAX_IP_LOGIN_ATTEMPTS: "  50  ",
        NODE_ENV: "development"
      });

      expect(config.maxLoginAttempts).toBe(10);
      expect(config.rateLimitWindowMs).toBe(900000);
      expect(config.lockoutDurationMs).toBe(3600000);
      expect(config.maxIpLoginAttempts).toBe(50);
    });
  });

  describe("Malformed Input Validation (Fail-Fast)", () => {
    it("rejects non-numeric string values with explicit error", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "five",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be a valid integer, received: \"five\"");

      expect(() =>
        resolveAuthRateLimitConfig({
          RATE_LIMIT_WINDOW_MS: "fifteen_minutes",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] RATE_LIMIT_WINDOW_MS must be a valid integer");
    });

    it("rejects float values to prevent silent truncation and unintended thresholds", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "5.5",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be a valid integer, received: \"5.5\"");
    });

    it("rejects trailing characters e.g. '5a' or '100px'", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_IP_LOGIN_ATTEMPTS: "30req",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS must be a valid integer, received: \"30req\"");
    });
  });

  describe("Boundary Validation", () => {
    it("rejects MAX_LOGIN_ATTEMPTS out of range [1, 20]", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "0",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be between 1 and 20, received: 0");

      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "-1",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be between 1 and 20, received: -1");

      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "21",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_LOGIN_ATTEMPTS must be between 1 and 20, received: 21");
    });

    it("accepts MAX_LOGIN_ATTEMPTS exact boundaries 1 and 20", () => {
      const minConfig = resolveAuthRateLimitConfig({
        MAX_LOGIN_ATTEMPTS: "1",
        NODE_ENV: "development"
      });
      expect(minConfig.maxLoginAttempts).toBe(1);

      const maxConfig = resolveAuthRateLimitConfig({
        MAX_LOGIN_ATTEMPTS: "20",
        MAX_IP_LOGIN_ATTEMPTS: "30",
        NODE_ENV: "development"
      });
      expect(maxConfig.maxLoginAttempts).toBe(20);
    });

    it("rejects RATE_LIMIT_WINDOW_MS outside [60,000, 86,400,000]", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          RATE_LIMIT_WINDOW_MS: "59999",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] RATE_LIMIT_WINDOW_MS must be between 60000 and 86400000");

      expect(() =>
        resolveAuthRateLimitConfig({
          RATE_LIMIT_WINDOW_MS: "86400001",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] RATE_LIMIT_WINDOW_MS must be between 60000 and 86400000");
    });

    it("rejects LOCKOUT_DURATION_MS outside [60,000, 604,800,000]", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          RATE_LIMIT_WINDOW_MS: "60000",
          LOCKOUT_DURATION_MS: "59999",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] LOCKOUT_DURATION_MS must be between 60000 and 604800000");

      expect(() =>
        resolveAuthRateLimitConfig({
          LOCKOUT_DURATION_MS: "604800001",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] LOCKOUT_DURATION_MS must be between 60000 and 604800000");
    });

    it("rejects MAX_IP_LOGIN_ATTEMPTS outside [5, 1000]", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "3",
          MAX_IP_LOGIN_ATTEMPTS: "4",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS must be between 5 and 1000");

      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_IP_LOGIN_ATTEMPTS: "1001",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS must be between 5 and 1000");
    });
  });

  describe("Cross-Field Relationship Validation", () => {
    it("rejects LOCKOUT_DURATION_MS shorter than RATE_LIMIT_WINDOW_MS", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          RATE_LIMIT_WINDOW_MS: "1800000", // 30 min
          LOCKOUT_DURATION_MS: "900000",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] LOCKOUT_DURATION_MS (900000ms) cannot be shorter than RATE_LIMIT_WINDOW_MS (1800000ms)");
    });

    it("rejects MAX_IP_LOGIN_ATTEMPTS smaller than MAX_LOGIN_ATTEMPTS", () => {
      expect(() =>
        resolveAuthRateLimitConfig({
          MAX_LOGIN_ATTEMPTS: "10",
          MAX_IP_LOGIN_ATTEMPTS: "8",
          NODE_ENV: "development"
        }),
      ).toThrow("[Security Configuration Error] MAX_IP_LOGIN_ATTEMPTS (8) cannot be less than MAX_LOGIN_ATTEMPTS (10)");
    });
  });

  describe("Singleton Getter and Cache Isolation", () => {
    it("returns frozen singleton configuration object", () => {
      const config1 = getAuthRateLimitConfig();
      const config2 = getAuthRateLimitConfig();

      expect(config1).toBe(config2);
      expect(Object.isFrozen(config1)).toBe(true);
    });

    it("refreshes cached config when cache is explicitly reset", () => {
      const origMax = process.env.MAX_LOGIN_ATTEMPTS;
      try {
        process.env.MAX_LOGIN_ATTEMPTS = "3";
        resetAuthRateLimitConfigCache();
        const configA = getAuthRateLimitConfig();
        expect(configA.maxLoginAttempts).toBe(3);

        process.env.MAX_LOGIN_ATTEMPTS = "4";
        resetAuthRateLimitConfigCache();
        const configB = getAuthRateLimitConfig();
        expect(configB.maxLoginAttempts).toBe(4);
      } finally {
        process.env.MAX_LOGIN_ATTEMPTS = origMax;
        resetAuthRateLimitConfigCache();
      }
    });
  });
});
