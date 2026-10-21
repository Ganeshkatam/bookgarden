import { WorkerDatabaseClient, ClaimedOutboxEvent } from "./WorkerDatabaseClient";
import { Pool } from "pg";

jest.mock("pg", () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe("WorkerDatabaseClient", () => {
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKGARDEN_WORKER_DATABASE_URL = "postgres://bookgarden_worker:pass@localhost:5432/postgres";
    // Reset cached pool
    delete (globalThis as any).__bookgardenWorkerPool;
    mockPool = (new Pool() as any);
  });

  afterEach(() => {
    delete (globalThis as any).__bookgardenWorkerPool;
  });

  describe("claimOutboxEvents", () => {
    it("delegates to internal.claim_outbox_events with parameters", async () => {
      const mockRows: ClaimedOutboxEvent[] = [
        {
          id: "c0000000-0000-0000-0000-000000000001",
          event_type: "system.pr1_canary",
          payload: { test: true },
          occurred_at: "2026-10-07T00:00:00Z",
          retry_count: 0,
          lease_id: "l0000000-0000-0000-0000-000000000001",
        },
      ];
      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await WorkerDatabaseClient.claimOutboxEvents(1, "canary-worker", 300);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("internal.claim_outbox_events($1, $2, $3)"),
        [1, "canary-worker", 300],
      );
      expect(result).toEqual(mockRows);
    });
  });

  describe("completeOutboxEvent", () => {
    it("delegates to internal.complete_outbox_event with parameters", async () => {
      const mockResult: ClaimedOutboxEvent = {
        id: "c0000000-0000-0000-0000-000000000001",
        event_type: "system.pr1_canary",
        payload: {},
        occurred_at: "2026-10-07T00:00:00Z",
        retry_count: 0,
        lease_id: "l0000000-0000-0000-0000-000000000001",
      };
      mockPool.query.mockResolvedValue({ rows: [mockResult] });

      const result = await WorkerDatabaseClient.completeOutboxEvent(
        "c0000000-0000-0000-0000-000000000001",
        "l0000000-0000-0000-0000-000000000001",
        "processed",
        null,
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("internal.complete_outbox_event($1, $2, $3, $4)"),
        [
          "c0000000-0000-0000-0000-000000000001",
          "l0000000-0000-0000-0000-000000000001",
          "processed",
          null,
        ],
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("getOutboxMetrics", () => {
    it("maps database metric rows to OutboxStatusMetrics DTO", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { status: "pending", event_count: "1047" },
          { status: "processing", event_count: "0" },
          { status: "processed", event_count: "50" },
          { status: "failed", event_count: "2" },
          { status: "dead_letter", event_count: "4" },
        ],
      });

      const metrics = await WorkerDatabaseClient.getOutboxMetrics();

      expect(metrics).toEqual({
        pending: 1047,
        processing: 0,
        processed: 50,
        failed: 2,
        deadLetter: 4,
      });
    });
  });

  describe("Outbox Lease Expiration & Retry Ceiling Invariant (Regression)", () => {
    /**
     * Pure reference implementation of the database internal.claim_outbox_events procedure
     * validating state transitions, ceiling enforcement, and self-healing.
     */
    interface OutboxRow {
      id: string;
      status: "pending" | "processing" | "processed" | "failed" | "dead_letter";
      retry_count: number;
      lease_id: string | null;
      lease_expires_at: Date | null;
      last_error: string | null;
      processed_at: Date | null;
    }

    function simulateClaimOutboxEvents(
      events: OutboxRow[],
      limitCount: number = 10,
      now: Date = new Date("2026-10-07T12:00:00Z"),
    ): { claimed: OutboxRow[]; tableState: OutboxRow[] } {
      const state = events.map((e) => ({ ...e }));

      // Phase 1: Expired lease sweep for events reaching or exceeding terminal retry ceiling (retry_count + 1 >= 3, i.e. retry_count >= 2)
      for (const row of state) {
        if (
          row.status === "processing" &&
          row.lease_expires_at !== null &&
          row.lease_expires_at < now &&
          row.retry_count >= 2
        ) {
          row.status = "dead_letter";
          row.retry_count = row.retry_count + 1;
          row.last_error = "MAX_RETRIES_EXCEEDED_AFTER_LEASE_EXPIRATION";
          row.lease_id = null;
          row.lease_expires_at = null;
          row.processed_at = null;
        }

        // Self-healing for any legacy failed rows with retry_count >= 3
        if (row.status === "failed" && row.retry_count >= 3) {
          row.status = "dead_letter";
          row.last_error = row.last_error ?? "MAX_RETRIES_EXCEEDED_AFTER_FAILURE";
          row.lease_id = null;
          row.lease_expires_at = null;
          row.processed_at = null;
        }
      }

      // Phase 2: Candidate selection
      const candidates: OutboxRow[] = [];
      for (const row of state) {
        if (
          row.status === "pending" ||
          (row.status === "failed" && row.retry_count < 3) ||
          (row.status === "processing" &&
            row.lease_expires_at !== null &&
            row.lease_expires_at < now &&
            row.retry_count < 2)
        ) {
          candidates.push(row);
          if (candidates.length >= limitCount) break;
        }
      }

      // Phase 3: Transition claimed candidates to processing
      const claimed: OutboxRow[] = [];
      for (const cand of candidates) {
        cand.retry_count = cand.status === "processing" ? cand.retry_count + 1 : cand.retry_count;
        cand.status = "processing";
        cand.lease_id = "new-lease-id";
        cand.lease_expires_at = new Date(now.getTime() + 300000);
        cand.processed_at = null;
        claimed.push({ ...cand });
      }

      return { claimed, tableState: state };
    }

    it("transitions event in processing with retry_count = 2 and expired lease to dead_letter (NOT processing)", () => {
      const now = new Date("2026-10-07T12:00:00Z");
      const expiredTime = new Date("2026-10-07T11:55:00Z"); // 5 minutes ago

      const initialEvent: OutboxRow = {
        id: "event-attempt-3-crashed",
        status: "processing",
        retry_count: 2, // 3rd attempt
        lease_id: "expired-lease-uuid",
        lease_expires_at: expiredTime,
        last_error: null,
        processed_at: null,
      };

      const { claimed, tableState } = simulateClaimOutboxEvents([initialEvent], 1, now);

      // Must NOT be claimed as processing
      expect(claimed).toHaveLength(0);

      // Must transition to dead_letter with incremented retry_count = 3
      const updatedEvent = tableState.find((e) => e.id === "event-attempt-3-crashed")!;
      expect(updatedEvent.status).toBe("dead_letter");
      expect(updatedEvent.retry_count).toBe(3);
      expect(updatedEvent.last_error).toBe("MAX_RETRIES_EXCEEDED_AFTER_LEASE_EXPIRATION");
      expect(updatedEvent.lease_id).toBeNull();
      expect(updatedEvent.lease_expires_at).toBeNull();
      expect(updatedEvent.processed_at).toBeNull();
    });

    it("reclaims event in processing with retry_count = 1 and expired lease into processing with retry_count = 2", () => {
      const now = new Date("2026-10-07T12:00:00Z");
      const expiredTime = new Date("2026-10-07T11:55:00Z");

      const initialEvent: OutboxRow = {
        id: "event-attempt-2-crashed",
        status: "processing",
        retry_count: 1, // 2nd attempt
        lease_id: "expired-lease-uuid",
        lease_expires_at: expiredTime,
        last_error: null,
        processed_at: null,
      };

      const { claimed, tableState } = simulateClaimOutboxEvents([initialEvent], 1, now);

      // Must be claimed
      expect(claimed).toHaveLength(1);
      expect(claimed[0].id).toBe("event-attempt-2-crashed");
      expect(claimed[0].status).toBe("processing");
      expect(claimed[0].retry_count).toBe(2); // Incremented from 1 to 2 (3rd attempt)
      expect(claimed[0].lease_id).toBe("new-lease-id");

      const updatedEvent = tableState.find((e) => e.id === "event-attempt-2-crashed")!;
      expect(updatedEvent.status).toBe("processing");
      expect(updatedEvent.retry_count).toBe(2);
    });
  });
});
