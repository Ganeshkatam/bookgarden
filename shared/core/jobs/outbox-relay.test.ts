import { processOutbox, getOutboxMetrics } from "./outbox-relay";
import { WorkerDatabaseClient, ClaimedOutboxEvent } from "@/shared/infrastructure/database/WorkerDatabaseClient";
import { IEventBus } from "../events/types";

jest.mock("@/shared/infrastructure/database/WorkerDatabaseClient", () => ({
  WorkerDatabaseClient: {
    claimOutboxEvents: jest.fn(),
    completeOutboxEvent: jest.fn(),
    getOutboxMetrics: jest.fn(),
  },
}));

describe("Outbox Relay", () => {
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = {
      emit: jest.fn(),
      dispatch: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
    };
  });

  const createMockEvent = (overrides?: Partial<ClaimedOutboxEvent>): ClaimedOutboxEvent => ({
    id: "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1",
    event_type: "reader.session.started",
    payload: { sessionId: "s1", userId: "u1", bookId: "b1", startedAt: "2026-09-01T00:00:00Z" },
    occurred_at: "2026-09-01T00:00:00Z",
    retry_count: 0,
    lease_id: "l1l1l1l1-l1l1-4l1l-8l1l-l1l1l1l1l1l1",
    ...overrides,
  });

  describe("processOutbox", () => {
    it("successfully processes claimed events, awaits dispatch, and marks them processed with lease_id", async () => {
      const mockEvent = createMockEvent();
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(mockEvent);

      let dispatchCompleted = false;
      mockEventBus.dispatch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        dispatchCompleted = true;
      });

      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockImplementation(async () => {
        expect(dispatchCompleted).toBe(true);
        return mockEvent;
      });

      const result = await processOutbox(mockEventBus, "test-worker");

      expect(WorkerDatabaseClient.claimOutboxEvents).toHaveBeenCalledWith(50, "test-worker", 300);
      expect(mockEventBus.dispatch).toHaveBeenCalledWith(
        "reader.session.started",
        mockEvent.payload,
        {
          eventId: mockEvent.id,
          occurredAt: mockEvent.occurred_at,
        },
      );
      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        mockEvent.id,
        mockEvent.lease_id,
        "processed",
      );
      expect(result).toEqual({ processed: 1, failed: 0, deadLetter: 0 });
    });

    it("returns zero counts when no events are available to claim", async () => {
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([]);

      const result = await processOutbox(mockEventBus);

      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
      expect(WorkerDatabaseClient.completeOutboxEvent).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 0, failed: 0, deadLetter: 0 });
    });

    it("transitions failed event to failed when retry_count is below MAX_RETRIES (first failure)", async () => {
      const mockEvent = createMockEvent({ retry_count: 0 });
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      mockEventBus.dispatch.mockRejectedValue(new Error("Handler execution crashed"));
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(mockEvent);

      const result = await processOutbox(mockEventBus);

      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        mockEvent.id,
        mockEvent.lease_id,
        "failed",
        "Handler execution crashed",
      );
      expect(result).toEqual({ processed: 0, failed: 1, deadLetter: 0 });
    });

    it("transitions failed event to failed on intermediate retry (second failure)", async () => {
      const mockEvent = createMockEvent({ retry_count: 1 }); // Next attempt: 2 < MAX_RETRIES (3)
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      mockEventBus.dispatch.mockRejectedValue(new Error("Intermediate transient failure"));
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(mockEvent);

      const result = await processOutbox(mockEventBus);

      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        mockEvent.id,
        mockEvent.lease_id,
        "failed",
        "Intermediate transient failure",
      );
      expect(result).toEqual({ processed: 0, failed: 1, deadLetter: 0 });
    });

    it("transitions event to dead_letter when retry_count reaches MAX_RETRIES", async () => {
      const mockEvent = createMockEvent({ retry_count: 2 }); // Next attempt: 3 >= MAX_RETRIES (3)
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      mockEventBus.dispatch.mockRejectedValue(new Error("Persistent database failure in handler"));
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(mockEvent);

      const result = await processOutbox(mockEventBus);

      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        mockEvent.id,
        mockEvent.lease_id,
        "dead_letter",
        "Persistent database failure in handler",
      );
      expect(result).toEqual({ processed: 0, failed: 0, deadLetter: 1 });
    });

    it("routes malformed payload immediately to dead_letter without wasteful retries", async () => {
      const malformedEvent = createMockEvent({
        event_type: "reader.session.started",
        payload: { invalid: "missing required keys" }, // Missing userId, bookId, sessionId, startedAt
        retry_count: 0,
      });
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([malformedEvent]);
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(malformedEvent);

      const result = await processOutbox(mockEventBus);

      // Must not dispatch invalid payload to domain handlers
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();

      // Must transition directly to dead_letter
      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        malformedEvent.id,
        malformedEvent.lease_id,
        "dead_letter",
        expect.stringContaining("Payload validation failed"),
      );
      expect(result).toEqual({ processed: 0, failed: 0, deadLetter: 1 });
    });

    it("routes unknown event name immediately to dead_letter without executing any handler", async () => {
      const unknownEvent = createMockEvent({
        event_type: "unknown.system.event",
        payload: { foo: "bar" },
        retry_count: 0,
      });
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([unknownEvent]);
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValue(unknownEvent);

      const result = await processOutbox(mockEventBus);

      // Must not dispatch unknown event to any handler
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();

      // Must transition directly to dead_letter
      expect(WorkerDatabaseClient.completeOutboxEvent).toHaveBeenCalledWith(
        unknownEvent.id,
        unknownEvent.lease_id,
        "dead_letter",
        expect.stringContaining("Unknown or unsupported platform event name"),
      );
      expect(result).toEqual({ processed: 0, failed: 0, deadLetter: 1 });
    });

    it("reports failure accurately when database completion call fails after successful handler execution", async () => {
      const mockEvent = createMockEvent();
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      // Dispatch succeeds
      mockEventBus.dispatch.mockResolvedValue(undefined);
      // Database completion for 'processed' fails (e.g. database disconnect)
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockRejectedValueOnce(
        new Error("Database connection closed during completion"),
      );

      const result = await processOutbox(mockEventBus);

      // Relay must report the failure accurately: processed is 0, failed is 1
      expect(result).toEqual({ processed: 0, failed: 1, deadLetter: 0 });
    });

    it("prevents stale worker from completing event when lease expires and another worker claims it", async () => {
      const staleEvent = createMockEvent({
        lease_id: "stale-lease-1234",
      });
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([staleEvent]);
      // Dispatch took too long or lease expired; DB throws fence violation
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockRejectedValue(
        new Error("outbox lease is invalid or expired"),
      );

      const result = await processOutbox(mockEventBus);

      // Fencing prevented stale completion; event was not marked processed
      expect(result).toEqual({ processed: 0, failed: 1, deadLetter: 0 });
    });

    it("ensures retried event after worker crash does not duplicate business effect when handler uses idempotency", async () => {
      const mockEvent = createMockEvent({
        id: "event-uuid-crash-test",
      });

      // Track how many times business side effect executed
      let businessEffectCount = 0;
      // Simulated processed_events table for idempotency
      const processedEvents = new Set<string>();

      // Idempotent handler wrapper
      mockEventBus.dispatch.mockImplementation(async (_eventType, _payload) => {
        const idempotencyKey = `${mockEvent.id}:notification_handler`;
        if (processedEvents.has(idempotencyKey)) {
          // Already processed, skip business effect
          return;
        }
        // Execute business effect
        businessEffectCount++;
        // Record completion
        processedEvents.add(idempotencyKey);
      });

      // ATTEMPT 1: Worker claims event, handler succeeds, but worker crashes before acknowledgment
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValueOnce([mockEvent]);
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockRejectedValueOnce(
        new Error("Simulated worker process crash / network cut before DB acknowledgment"),
      );

      const attempt1Result = await processOutbox(mockEventBus);
      expect(attempt1Result.processed).toBe(0);
      expect(attempt1Result.failed).toBe(1);
      expect(businessEffectCount).toBe(1);

      // ATTEMPT 2: Subsequent retry by worker
      const retryEvent = createMockEvent({
        id: "event-uuid-crash-test",
        retry_count: 1,
        lease_id: "new-lease-id-5678",
      });
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValueOnce([retryEvent]);
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockResolvedValueOnce(retryEvent);

      const attempt2Result = await processOutbox(mockEventBus);
      expect(attempt2Result.processed).toBe(1);
      expect(attempt2Result.failed).toBe(0);

      // CRITICAL INVARIANT: Business effect was NOT duplicated! Count remains exactly 1.
      expect(businessEffectCount).toBe(1);
    });

    it("handles lease fencing violation without crashing batch loop", async () => {
      const mockEvent = createMockEvent();
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockResolvedValue([mockEvent]);
      mockEventBus.dispatch.mockRejectedValue(new Error("Temporary failure"));
      (WorkerDatabaseClient.completeOutboxEvent as jest.Mock).mockRejectedValue(
        new Error("Lease expired or invalid lease_id"),
      );

      const result = await processOutbox(mockEventBus);

      expect(result).toEqual({ processed: 0, failed: 1, deadLetter: 0 });
    });

    it("handles claim database failure gracefully with structured log", async () => {
      (WorkerDatabaseClient.claimOutboxEvents as jest.Mock).mockRejectedValue(
        new Error("Connection refused to database pool"),
      );

      const result = await processOutbox(mockEventBus);

      expect(result).toEqual({ processed: 0, failed: 0, deadLetter: 0 });
      expect(mockEventBus.dispatch).not.toHaveBeenCalled();
    });
  });

  describe("getOutboxMetrics", () => {
    it("delegates to WorkerDatabaseClient.getOutboxMetrics", async () => {
      const mockMetrics = {
        pending: 10,
        processing: 2,
        processed: 100,
        failed: 1,
        deadLetter: 3,
      };
      (WorkerDatabaseClient.getOutboxMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await getOutboxMetrics();

      expect(result).toEqual(mockMetrics);
    });

    it("returns null on error", async () => {
      (WorkerDatabaseClient.getOutboxMetrics as jest.Mock).mockRejectedValue(
        new Error("Query failed"),
      );

      const result = await getOutboxMetrics();

      expect(result).toBeNull();
    });
  });
});
