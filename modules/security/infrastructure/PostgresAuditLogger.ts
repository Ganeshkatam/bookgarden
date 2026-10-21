import { SupabaseClient } from "@supabase/supabase-js";
import { AuditContext, AuditLogger } from "../domain/AuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";
import { createSupabaseAdminClient } from "@/shared/core/database/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IP_REGEX =
  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

export class PostgresAuditLogger implements AuditLogger {
  constructor(private readonly supabase?: SupabaseClient) {}

  async logAction(
    action: SecurityAction,
    context: AuditContext,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // 1. Sanitize actor_id: must be a valid UUID or null for PostgreSQL UUID column
    const rawActorId = context.actorId?.trim();
    const isValidActorUuid = !!rawActorId && UUID_REGEX.test(rawActorId);
    const actorId = isValidActorUuid ? rawActorId : null;

    // 2. Sanitize ip_address: must be a valid IPv4/IPv6 address or null for PostgreSQL INET column
    const rawIp = context.ipAddress?.trim();
    const isValidIp = !!rawIp && rawIp !== "unknown" && IP_REGEX.test(rawIp);
    const ipAddress = isValidIp ? rawIp : null;

    // 3. Sanitize correlation_id: must be a valid UUID or null
    const rawCorrelationId = context.correlationId?.trim();
    const isValidCorrelationUuid =
      !!rawCorrelationId && UUID_REGEX.test(rawCorrelationId);
    const correlationId = isValidCorrelationUuid ? rawCorrelationId : null;

    // Preserve non-UUID actor strings (e.g. "anonymous") and raw IP strings safely in metadata
    const enrichedMetadata: Record<string, any> = {
      ...(metadata || {}),
      ...(rawActorId && !isValidActorUuid ? { raw_actor: rawActorId } : {}),
      ...(rawIp && !isValidIp ? { raw_ip: rawIp } : {}),
    };

    let targetClient = this.supabase;
    try {
      targetClient = createSupabaseAdminClient();
    } catch {
      // In tests or non-admin server contexts, fallback to injected client
    }

    if (!targetClient) {
      console.error("CRITICAL: Failed to write to audit log: No client available");
      return;
    }

    const { error } = await targetClient.from("audit_logs").insert({
      action,
      actor_id: actorId,
      ip_address: ipAddress,
      user_agent: context.userAgent || null,
      correlation_id: correlationId,
      metadata: enrichedMetadata,
    });

    if (error) {
      // We intentionally do not throw here to prevent auditing failures
      // from crashing the main application flow, but we log loudly.
      console.error("CRITICAL: Failed to write to audit log", error);
    }
  }
}
