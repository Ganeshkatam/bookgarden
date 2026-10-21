import { PostgresAuditLogger } from "./PostgresAuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";

describe("PostgresAuditLogger Security & Containment", () => {
  const validActorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const validCorrelationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const validIp = "192.168.1.100";

  it("sanitizes valid UUID actor_id, valid IP address, and valid correlation_id", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockClient: any = {
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };

    const logger = new PostgresAuditLogger(mockClient);
    await logger.logAction(
      SecurityAction.LoginSuccess,
      {
        actorId: validActorId,
        ipAddress: validIp,
        userAgent: "Mozilla/5.0",
        correlationId: validCorrelationId,
      },
      { provider: "email" },
    );

    expect(mockInsert).toHaveBeenCalledWith({
      action: SecurityAction.LoginSuccess,
      actor_id: validActorId,
      ip_address: validIp,
      user_agent: "Mozilla/5.0",
      correlation_id: validCorrelationId,
      metadata: {
        provider: "email",
      },
    });
  });

  it("safely handles non-UUID actor (e.g. 'anonymous') and invalid IP strings in metadata", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockClient: any = {
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };

    const logger = new PostgresAuditLogger(mockClient);
    await logger.logAction(
      SecurityAction.LoginFailed,
      {
        actorId: "anonymous-visitor",
        ipAddress: "unknown-or-invalid-ip",
        userAgent: "Curl",
      },
      { attempt: 1 },
    );

    expect(mockInsert).toHaveBeenCalledWith({
      action: SecurityAction.LoginFailed,
      actor_id: null,
      ip_address: null,
      user_agent: "Curl",
      correlation_id: null,
      metadata: {
        attempt: 1,
        raw_actor: "anonymous-visitor",
        raw_ip: "unknown-or-invalid-ip",
      },
    });
  });

  it("logs errors without throwing when audit table insertion fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockInsert = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied for table audit_logs", code: "42501" },
    });
    const mockClient: any = {
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };

    const logger = new PostgresAuditLogger(mockClient);
    await expect(
      logger.logAction(SecurityAction.Logout, { actorId: validActorId }),
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "CRITICAL: Failed to write to audit log",
      expect.objectContaining({ code: "42501" }),
    );
    consoleSpy.mockRestore();
  });
});
