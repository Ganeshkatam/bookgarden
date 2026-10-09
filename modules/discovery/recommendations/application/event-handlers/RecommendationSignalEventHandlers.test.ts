import { registerRecommendationSignalHandlers } from "./RecommendationSignalEventHandlers";
import { IEventBus, PlatformEventName, EventPayloads } from "@/shared/core/events/types";
import { createSupabaseServerClient } from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

class MockEventBus implements IEventBus {
  private handlers = new Map<string, Array<(payload: any) => Promise<void>>>();

  subscribe<T extends PlatformEventName>(
    event: T,
    handler: (payload: EventPayloads[T]) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler as any);
    return () => {};
  }

  async dispatch<T extends PlatformEventName>(event: T, payload: EventPayloads[T]): Promise<void> {
    const list = this.handlers.get(event) || [];
    for (const h of list) {
      await h(payload);
    }
  }

  emit<T extends PlatformEventName>(event: T, payload: EventPayloads[T]): void {
    this.dispatch(event, payload);
  }
}

describe("RecommendationSignalEventHandlers", () => {
  let bus: MockEventBus;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    bus = new MockEventBus();
    mockRpc = jest.fn();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({
      rpc: mockRpc,
    });
    registerRecommendationSignalHandlers(bus);
  });

  it("propagates RPC error on reader.page.completed to dispatcher instead of swallowing it", async () => {
    mockRpc.mockResolvedValueOnce({
      error: new Error("RPC refresh_recommendation_signals failed"),
    });

    await expect(
      bus.dispatch("reader.page.completed", {
        userId: "user-1",
        bookId: "book-1",
        pageNumber: 5,
        timestamp: Date.now(),
      }),
    ).rejects.toThrow("RPC refresh_recommendation_signals failed");
  });

  it("propagates unexpected exceptions to dispatcher", async () => {
    mockRpc.mockRejectedValueOnce(new Error("Supabase client network partition"));

    await expect(
      bus.dispatch("book.liked", {
        userId: "user-1",
        bookId: "book-1",
      }),
    ).rejects.toThrow("Supabase client network partition");
  });

  it("completes successfully when RPC succeeds without error", async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await expect(
      bus.dispatch("book.rated", {
        userId: "user-1",
        bookId: "book-1",
        rating: 5,
      }),
    ).resolves.toBeUndefined();
  });
});
