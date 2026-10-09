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
});
