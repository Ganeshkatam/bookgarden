import { SupabaseAnalyticsProjectionStore } from "./SupabaseAnalyticsProjectionStore";

describe("SupabaseAnalyticsProjectionStore", () => {
  let mockSupabase: any;
  let store: SupabaseAnalyticsProjectionStore;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { book_genres: [{ genres: { name: "Fiction" } }] } }),
          }),
        }),
      }),
      rpc: jest.fn(),
    };
    store = new SupabaseAnalyticsProjectionStore(mockSupabase);
  });

  it("throws error when RPC invocation fails during recordPagesRead", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      error: new Error("RPC increment_analytics_daily_pages failed"),
    });

    await expect(
      store.recordPagesRead("user-1", "book-1", 10, "2026-10-09"),
    ).rejects.toThrow("RPC increment_analytics_daily_pages failed");
  });

  it("throws error when RPC invocation fails during recordBookCompleted", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      error: new Error("RPC increment_analytics_daily_completed failed"),
    });

    await expect(
      store.recordBookCompleted("user-1", "book-1", "2026-10-09"),
    ).rejects.toThrow("RPC increment_analytics_daily_completed failed");
  });

  it("resolves successfully when all RPCs return no error", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await expect(
      store.recordBookCompleted("user-1", "book-1", "2026-10-09"),
    ).resolves.toBeUndefined();
  });

  it("invokes transactional idempotent RPC with p_event_id when eventId is provided to recordBookCompleted", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ error: null });

    await store.recordBookCompleted(
      "user-1",
      "book-1",
      "2026-10-09",
      "event-uuid-123",
    );

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "record_analytics_book_completed_idempotent",
      {
        p_event_id: "event-uuid-123",
        p_user_id: "user-1",
        p_book_id: "book-1",
        p_date: "2026-10-09",
        p_month: "2026-10",
        p_genre: "Fiction",
      },
    );
  });

  it("throws error when idempotent RPC fails during recordBookCompleted", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      error: new Error("RPC record_analytics_book_completed_idempotent transaction aborted"),
    });

    await expect(
      store.recordBookCompleted(
        "user-1",
        "book-1",
        "2026-10-09",
        "event-uuid-123",
      ),
    ).rejects.toThrow("RPC record_analytics_book_completed_idempotent transaction aborted");
  });

  it("invokes transactional idempotent RPC with p_event_id when eventId is provided to recordPagesRead", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ error: null });

    await store.recordPagesRead(
      "user-1",
      "book-1",
      25,
      "2026-10-09",
      "event-uuid-456",
    );

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "record_analytics_pages_read_idempotent",
      {
        p_event_id: "event-uuid-456",
        p_user_id: "user-1",
        p_book_id: "book-1",
        p_pages: 25,
        p_date: "2026-10-09",
        p_month: "2026-10",
        p_genre: "Fiction",
      },
    );
  });

  it("throws error when idempotent RPC fails during recordPagesRead", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      error: new Error("RPC record_analytics_pages_read_idempotent failed"),
    });

    await expect(
      store.recordPagesRead(
        "user-1",
        "book-1",
        25,
        "2026-10-09",
        "event-uuid-456",
      ),
    ).rejects.toThrow("RPC record_analytics_pages_read_idempotent failed");
  });
});
