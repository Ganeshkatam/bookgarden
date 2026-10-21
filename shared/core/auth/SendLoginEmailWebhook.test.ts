import {
  validateWebhookRequest,
  WebhookEnvironment,
} from "../../../supabase/functions/send-login-email/validator";

describe("send-login-email Webhook Containment & Authentication", () => {
  const VALID_WEBHOOK_SECRET = "whsec_0123456789abcdef0123456789abcdef";
  const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-key";
  const KNOWN_TRIGGER_SECRET = "7c9a4b2f8e1d6c5a3b0f9e8d7c6b5a4f";

  const defaultEnv: WebhookEnvironment = {
    WEBHOOK_SECRET: VALID_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: ANON_KEY,
  };

  const validRequestId = "11111111-1111-4111-8111-111111111111";
  const validIdempotencyKey = "22222222-2222-4222-8222-222222222222";
  const validSessionId = "33333333-3333-4333-8333-333333333333";
  const validUserId = "44444444-4444-4444-8444-444444444444";

  function createValidRequest(
    overrides: {
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
      url?: string;
    } = {},
  ): any {
    const url = overrides.url || "https://example.supabase.co/functions/v1/send-login-email";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-request-id": validRequestId,
      "x-timestamp": new Date().toISOString(),
      "idempotency-key": validIdempotencyKey,
      Authorization: `Bearer ${VALID_WEBHOOK_SECRET}`,
      ...(overrides.headers || {}),
    };

    const parsedBody = overrides.body !== undefined
      ? overrides.body
      : {
          type: "INSERT",
          schema: "auth",
          table: "sessions",
          record: {
            id: validSessionId,
            user_id: validUserId,
            created_at: new Date().toISOString(),
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            ip: "127.0.0.1",
          },
          old_record: null,
        };

    return {
      url,
      method: "POST",
      headers: {
        get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
        ...headers,
      },
      json: async () => parsedBody,
      body: JSON.stringify(parsedBody),
    };
  }

  describe("Legacy and Unauthorized Authentication Rejection", () => {
    it("rejects legacy query-string authentication (?secret=...)", async () => {
      const req = createValidRequest({
        url: `https://example.supabase.co/functions/v1/send-login-email?secret=${KNOWN_TRIGGER_SECRET}`,
        headers: {
          Authorization: "", // Legacy callers sent query param without Authorization header
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const data = await result.response.json();
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("rejects hardcoded KNOWN_TRIGGER_SECRET presented in Bearer header", async () => {
      const req = createValidRequest({
        headers: {
          Authorization: `Bearer ${KNOWN_TRIGGER_SECRET}`,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const data = await result.response.json();
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("rejects service-role key presented in Bearer header", async () => {
      const req = createValidRequest({
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const data = await result.response.json();
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("rejects anon key presented in Bearer header", async () => {
      const req = createValidRequest({
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it("fails closed (500) if server misconfigures WEBHOOK_SECRET equal to SUPABASE_SERVICE_ROLE_KEY", async () => {
      const misconfiguredEnv: WebhookEnvironment = {
        WEBHOOK_SECRET: SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
        SUPABASE_ANON_KEY: ANON_KEY,
      };

      const req = createValidRequest({
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      const result = await validateWebhookRequest(req, misconfiguredEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(500);
        const data = await result.response.json();
        expect(data.error).toBe("Server misconfiguration");
      }
    });

    it("fails closed (500) if WEBHOOK_SECRET is not configured", async () => {
      const missingEnv: WebhookEnvironment = {
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
        SUPABASE_ANON_KEY: ANON_KEY,
      };

      const req = createValidRequest();
      const result = await validateWebhookRequest(req, missingEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(500);
      }
    });

    it("rejects non-Bearer authentication schemes (Basic, ApiKey)", async () => {
      const req = createValidRequest({
        headers: {
          Authorization: `Basic dXNlcjpwYXNz`,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe("Replay Protection and Timestamp Window Verification", () => {
    it("rejects requests missing x-timestamp header", async () => {
      const req = createValidRequest({
        headers: {
          "x-timestamp": "",
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    });

    it("rejects expired requests with timestamp > 300 seconds in past", async () => {
      const expiredTime = new Date(Date.now() - 301_000).toISOString();
      const req = createValidRequest({
        headers: {
          "x-timestamp": expiredTime,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        const data = await result.response.json();
        expect(data.error).toContain("300-second window");
      }
    });

    it("rejects requests with timestamp > 300 seconds in future", async () => {
      const futureTime = new Date(Date.now() + 301_000).toISOString();
      const req = createValidRequest({
        headers: {
          "x-timestamp": futureTime,
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    });
  });

  describe("Header and Identifier Validation", () => {
    it("rejects requests missing or invalid X-Request-ID", async () => {
      const req = createValidRequest({
        headers: {
          "x-request-id": "not-a-uuid",
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        const data = await result.response.json();
        expect(data.error).toContain("X-Request-ID");
      }
    });

    it("rejects requests missing or invalid Idempotency-Key", async () => {
      const req = createValidRequest({
        headers: {
          "idempotency-key": "not-a-uuid",
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        const data = await result.response.json();
        expect(data.error).toContain("Idempotency-Key");
      }
    });
  });

  describe("Payload Structure Validation", () => {
    it("rejects invalid JSON body", async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-request-id": validRequestId,
        "x-timestamp": new Date().toISOString(),
        "idempotency-key": validIdempotencyKey,
        Authorization: `Bearer ${VALID_WEBHOOK_SECRET}`,
      };
      const req = {
        url: "https://example.supabase.co/functions/v1/send-login-email",
        method: "POST",
        headers: {
          get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
          ...headers,
        },
        json: async () => {
          throw new Error("Invalid JSON");
        },
        body: "{ malformed json",
      };

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    });

    it("rejects non-session payload", async () => {
      const req = createValidRequest({
        body: {
          type: "UPDATE",
          schema: "public",
          table: "users",
          record: { id: validUserId },
        },
      });

      const result = await validateWebhookRequest(req, defaultEnv);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    });
  });

  describe("Authorized Request Success", () => {
    it("successfully validates authentic request with valid Bearer credential", async () => {
      const req = createValidRequest();
      const result = await validateWebhookRequest(req, defaultEnv);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.requestId).toBe(validRequestId);
        expect(result.idempotencyKey).toBe(validIdempotencyKey);
        expect(result.session.id).toBe(validSessionId);
        expect(result.session.user_id).toBe(validUserId);
      }
    });
  });
});
