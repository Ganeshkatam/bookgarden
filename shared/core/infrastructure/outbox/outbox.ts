import { SupabaseClient } from "@supabase/supabase-js";
import { PlatformEventName, EventPayloads } from "../../events/types";
import { Database } from "../../types/database";
import { createSupabaseAdminClient } from "../../database/admin";

/**
 * Emits an event to the Transactional Outbox for asynchronous processing.
 * Uses privileged server admin client in server runtime, falling back to
 * the provided client when running in unit tests / mock environments.
 */
export async function emitOutboxEvent<T extends PlatformEventName>(
  client: SupabaseClient<Database> | null | undefined,
  eventName: T,
  payload: EventPayloads[T],
  aggregateType: string = "reader",
  aggregateId: string = (payload as any).userId || "system",
): Promise<void> {
  let targetClient = client;

  // In Node.js server environments, use privileged admin client
  try {
    targetClient = createSupabaseAdminClient();
  } catch {
    // Falls back to injected client if admin client is unconfigured (e.g. unit tests)
    if (!targetClient) {
      throw new Error("Outbox client is not configured");
    }
  }

  const { error } = await targetClient.from("outbox_events").insert({
    event_type: eventName,
    payload: payload as any,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    status: "pending",
    retry_count: 0,
  });

  if (error) {
    console.error("Failed to emit outbox event:", error);
    throw new Error("Failed to emit outbox event");
  }
}
