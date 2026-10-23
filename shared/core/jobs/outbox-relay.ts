import { IEventBus, PlatformEventName, EventPayloads, EventContext } from "../../core/events/types";
import { WorkerDatabaseClient } from "@/shared/infrastructure/database/WorkerDatabaseClient";
import {
  validateEventPayload,
  PayloadValidationError,
} from "../../core/events/payload-validators";

const MAX_RETRIES = 3;

/**
 * Outbox Relay
 *
 * Polls `outbox_events` for pending events with fenced leases, validates event payloads,
 * dispatches them to registered handlers on the EventBus (awaiting full execution), and
 * marks them as completed via internal scoped capabilities.
 *
 * Design decisions:
 * - Uses `WorkerDatabaseClient` via direct PostgreSQL connection using `bookgarden_worker` role.
 * - Invokes `internal.claim_outbox_events` RPC for safe concurrent claiming with lease fencing (FOR UPDATE SKIP LOCKED).
 * - Invokes `internal.complete_outbox_event` RPC for state transitions with lease validation.
 * - Awaits handler completion via `eventBus.dispatch` to prevent premature event completion.
 * - Validates payload structure at runtime, routing malformed payloads directly to dead_letter.
 * - Never mutates `public.outbox_events` directly.
 * - Does NOT use SUPABASE_SERVICE_ROLE_KEY or PostgREST Data API.
 */

export interface OutboxRelayResult {
  processed: number;
  failed: number;
  deadLetter: number;
}

export async function processOutbox(
  eventBus: IEventBus,
  workerIdentity: string = `worker-${process.pid || "node"}`,
): Promise<OutboxRelayResult> {
  // 1. Claim pending events atomically with fenced lease
  let events;
  try {
    events = await WorkerDatabaseClient.claimOutboxEvents(50, workerIdentity, 300);
  } catch (claimError: unknown) {
    const message = claimError instanceof Error ? claimError.message : String(claimError);
    console.error(
      "[Outbox Relay] Failed to claim events via WorkerDatabaseClient:",
      message,
    );
    return { processed: 0, failed: 0, deadLetter: 0 };
  }

  if (!events || events.length === 0) {
    return { processed: 0, failed: 0, deadLetter: 0 };
  }

  let processed = 0;
  let failed = 0;
  let deadLetter = 0;

  // 2. Process each claimed event
  for (const event of events) {
    let dispatchSucceeded = false;
    try {
      const eventType = event.event_type as PlatformEventName;

      // Validate payload structure at runtime before handler invocation
      const validatedPayload = validateEventPayload(eventType, event.payload);

      // Await all registered handlers before marking event processed, supplying immutable outbox event context
      const context: EventContext = {
        eventId: event.id,
        occurredAt: event.occurred_at,
      };
      await eventBus.dispatch(eventType, validatedPayload, context);
      dispatchSucceeded = true;

      // 3. Mark as processed via fenced complete RPC
      await WorkerDatabaseClient.completeOutboxEvent(
        event.id,
        event.lease_id,
        "processed",
      );

      processed++;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const isValidationError = error instanceof PayloadValidationError;
      const isLeaseError = errorMsg.toLowerCase().includes("lease");
      const newRetryCount = (event.retry_count || 0) + 1;
      // Invariant: Validation errors are permanently invalid and must transition directly
      // to 'dead_letter'. For transient errors, transition to 'dead_letter' when retry_count reaches MAX_RETRIES.
      const isDeadLetter = isValidationError || newRetryCount >= MAX_RETRIES;

      // Distinguish handler execution failures from database acknowledgment failures
      const recordedError = dispatchSucceeded
        ? `Database acknowledgment failed: ${errorMsg}`
        : errorMsg;

      // Only attempt secondary completion if the failure wasn't already a lease fencing/expiry violation
      if (!isLeaseError) {
        try {
          await WorkerDatabaseClient.completeOutboxEvent(
            event.id,
            event.lease_id,
            isDeadLetter ? "dead_letter" : "failed",
            recordedError,
          );
        } catch (completeErr: unknown) {
          const fenceMsg = completeErr instanceof Error ? completeErr.message : String(completeErr);
          console.error(
            `[Outbox Relay] Completion RPC failed for event ${event.id} (target status: ${isDeadLetter ? "dead_letter" : "failed"}):`,
            fenceMsg,
          );
        }
      } else {
        console.error(
          `[Outbox Relay] Lease fencing violation on event ${event.id}; aborting further completion attempts on expired lease: ${errorMsg}`,
        );
      }

      if (isDeadLetter) {
        console.error(
          `[Outbox Relay] Permanently failed event ${event.id} (transitioned to dead_letter): ${recordedError}`,
        );
        deadLetter++;
      } else {
        console.warn(
          `[Outbox Relay] Retryable failure for event ${event.id} (attempt ${newRetryCount}/${MAX_RETRIES}): ${recordedError}`,
        );
        failed++;
      }
    }
  }


  console.log(
    `[Outbox Relay] Batch complete: ${processed} processed, ${failed} failed, ${deadLetter} dead letter`,
  );

  return { processed, failed, deadLetter };
}

/**
 * Returns operational metrics for monitoring from internal.get_outbox_metrics.
 */
export async function getOutboxMetrics() {
  try {
    return await WorkerDatabaseClient.getOutboxMetrics();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Outbox Relay] Failed to fetch outbox metrics:", message);
    return null;
  }
}
