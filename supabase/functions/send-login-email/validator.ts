export interface SessionRecord {
  id: string;
  user_id: string;
  created_at: string;
  user_agent?: string;
  ip?: string;
}

export interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: SessionRecord;
  old_record: Record<string, unknown> | null;
}

export interface WebhookValidationSuccess {
  ok: true;
  requestId: string;
  idempotencyKey: string;
  session: SessionRecord;
}

export interface WebhookValidationFailure {
  ok: false;
  response: Response;
}

export type WebhookValidationResult =
  | WebhookValidationSuccess
  | WebhookValidationFailure;

export interface WebhookEnvironment {
  WEBHOOK_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const aLen = a.length;
  const bLen = b.length;
  let mismatch = aLen === bLen ? 0 : 1;
  const maxLen = Math.max(aLen, bLen);
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? a.charCodeAt(i) : 0;
    const bChar = i < bLen ? b.charCodeAt(i) : 0;
    mismatch |= aChar ^ bChar;
  }
  return mismatch === 0;
}

function getHeader(req: any, headerName: string): string | null {
  if (!req || !req.headers) return null;
  if (typeof req.headers.get === "function") {
    const val = req.headers.get(headerName);
    if (val !== null && val !== undefined) return val;
    return req.headers.get(headerName.toLowerCase()) ?? null;
  }
  const targetLower = headerName.toLowerCase();
  for (const key of Object.keys(req.headers)) {
    if (key.toLowerCase() === targetLower) {
      return req.headers[key] ?? null;
    }
  }
  return null;
}

async function getJsonBody(req: any): Promise<unknown> {
  if (typeof req.json === "function") {
    try {
      return await req.json();
    } catch {
      throw new Error("Invalid JSON");
    }
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON");
    }
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  return null;
}

function createJsonResponse(data: unknown, status: number): Response {
  const jsonStr = JSON.stringify(data);
  const respObj = {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (k: string) => (k.toLowerCase() === "content-type" ? "application/json" : null),
    },
    json: async () => data,
    text: async () => jsonStr,
  };

  if (typeof Response !== "undefined") {
    try {
      const res = new Response(jsonStr, {
        status,
        headers: { "Content-Type": "application/json" },
      });
      if (res && res.status === status) {
        return res;
      }
    } catch {
      // Fallback to stub object
    }
  }

  return respObj as unknown as Response;
}

export async function validateWebhookRequest(
  req: Request | any,
  env: WebhookEnvironment,
): Promise<WebhookValidationResult> {
  // 1. Mandatory X-Request-ID Header (UUIDv4)
  const requestIdHeader = getHeader(req, "x-request-id");
  if (!requestIdHeader || !isValidUuid(requestIdHeader)) {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Missing or invalid X-Request-ID header; must be UUIDv4" },
        400,
      ),
    };
  }
  const requestId = requestIdHeader;

  // 2. Server Configuration Validation
  const webhookSecret = env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[send-login-email] Misconfigured: WEBHOOK_SECRET is not set.");
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Server misconfiguration", requestId },
        500,
      ),
    };
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (serviceRoleKey && constantTimeEqual(webhookSecret, serviceRoleKey)) {
    console.error(
      "[send-login-email] Misconfigured: WEBHOOK_SECRET cannot be identical to SUPABASE_SERVICE_ROLE_KEY.",
    );
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Server misconfiguration", requestId },
        500,
      ),
    };
  }

  // 3. Authorization Header Validation (Dedicated Bearer Credential Only)
  // Query-string tokens (?secret=...) and other schemes are strictly rejected.
  const authHeader = getHeader(req, "Authorization") || getHeader(req, "authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Unauthorized", requestId },
        401,
      ),
    };
  }

  const incomingToken = authHeader.substring(7).trim();

  // Reject if token is service-role key or anon key (never allow infra keys to trigger webhooks)
  if (
    (serviceRoleKey && constantTimeEqual(incomingToken, serviceRoleKey)) ||
    (anonKey && constantTimeEqual(incomingToken, anonKey))
  ) {
    console.warn(
      `[send-login-email] Rejected service-role or anon key presented on webhook (requestId: ${requestId})`,
    );
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Unauthorized", requestId },
        401,
      ),
    };
  }

  // Require constant-time equality with dedicated WEBHOOK_SECRET
  if (!constantTimeEqual(incomingToken, webhookSecret)) {
    console.warn(
      `[send-login-email] Invalid webhook token presented (requestId: ${requestId})`,
    );
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Unauthorized", requestId },
        401,
      ),
    };
  }

  // 4. Request Timestamp Window Validation (mandatory, +/- 300 seconds)
  const timestampHeader = getHeader(req, "x-timestamp");
  if (!timestampHeader) {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Missing mandatory X-Timestamp header", requestId },
        400,
      ),
    };
  }

  const parsedTime = Date.parse(timestampHeader);
  if (isNaN(parsedTime) || Math.abs(Date.now() - parsedTime) > 300_000) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          error: "Request timestamp outside permitted 300-second window",
          requestId,
        },
        400,
      ),
    };
  }

  // 5. Idempotency-Key Header Validation (UUIDv4)
  const idempotencyHeader = getHeader(req, "idempotency-key");
  if (!idempotencyHeader || !isValidUuid(idempotencyHeader)) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          error: "Missing or invalid Idempotency-Key header; must be UUIDv4",
          requestId,
        },
        400,
      ),
    };
  }
  const idempotencyKey = idempotencyHeader;

  // 6. Payload Bounds and Structure Validation
  let rawBody: unknown;
  try {
    rawBody = await getJsonBody(req);
  } catch {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Invalid JSON payload", requestId },
        400,
      ),
    };
  }

  if (!rawBody || typeof rawBody !== "object") {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Invalid payload structure", requestId },
        400,
      ),
    };
  }

  const payload = rawBody as Partial<WebhookPayload>;
  if (
    payload.type !== "INSERT" ||
    payload.schema !== "auth" ||
    payload.table !== "sessions" ||
    !payload.record ||
    typeof payload.record !== "object"
  ) {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Invalid webhook payload structure", requestId },
        400,
      ),
    };
  }

  const rawSession = payload.record;
  if (!isValidUuid(rawSession.id) || !isValidUuid(rawSession.user_id)) {
    return {
      ok: false,
      response: createJsonResponse(
        { error: "Invalid session or user identifier", requestId },
        400,
      ),
    };
  }

  const userAgentBounded = typeof rawSession.user_agent === "string"
    ? rawSession.user_agent.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 512)
    : undefined;

  const ipBounded = typeof rawSession.ip === "string"
    ? rawSession.ip.replace(/[\x00-\x1F\x7F\s]/g, "").slice(0, 45)
    : undefined;

  const sessionCreatedAt =
    typeof rawSession.created_at === "string" && !isNaN(Date.parse(rawSession.created_at))
      ? rawSession.created_at
      : new Date().toISOString();

  const session: SessionRecord = {
    id: rawSession.id,
    user_id: rawSession.user_id,
    created_at: sessionCreatedAt,
    user_agent: userAgentBounded,
    ip: ipBounded,
  };

  return {
    ok: true,
    requestId,
    idempotencyKey,
    session,
  };
}
