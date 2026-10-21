import { eventBus } from "./EventBus";

describe("MemoryEventBus", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  describe("dispatch", () => {
    it("resolves immediately when no handlers are registered", async () => {
      await expect(
        eventBus.dispatch("reader.book.completed", {
          userId: "u1",
          bookId: "b1",
        }),
      ).resolves.toBeUndefined();
    });

    it("awaits registered async handlers to full completion", async () => {
      let executionOrder: number[] = [];

      eventBus.subscribe("reader.book.completed", async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        executionOrder.push(1);
      });

      eventBus.subscribe("reader.book.completed", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push(2);
      });

      await eventBus.dispatch("reader.book.completed", {
        userId: "u1",
        bookId: "b1",
      });

      expect(executionOrder).toHaveLength(2);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });

    it("propagates handler errors directly to the caller", async () => {
      eventBus.subscribe("reader.book.completed", async () => {
        throw new Error("Handler database connection failure");
      });

      await expect(
        eventBus.dispatch("reader.book.completed", {
          userId: "u1",
          bookId: "b1",
        }),
      ).rejects.toThrow("Handler database connection failure");
    });

    it("waits for all handlers to settle before propagating rejection when one handler fails while another is still running", async () => {
      let slowHandlerSettled = false;

      // Slow handler: takes 30ms
      eventBus.subscribe("reader.book.completed", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        slowHandlerSettled = true;
      });

      // Fast failing handler: fails after 5ms
      eventBus.subscribe("reader.book.completed", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error("Fast handler failure");
      });

      await expect(
        eventBus.dispatch("reader.book.completed", {
          userId: "u1",
          bookId: "b1",
        }),
      ).rejects.toThrow("Fast handler failure");

      // Verify that dispatch did not abort early before slow handler finished
      expect(slowHandlerSettled).toBe(true);
    });

    it("stops or propagates if any handler in a group fails", async () => {
      let handlerOneRan = false;
      eventBus.subscribe("reader.book.completed", async () => {
        handlerOneRan = true;
      });

      eventBus.subscribe("reader.book.completed", async () => {
        throw new Error("Group handler error");
      });

      await expect(
        eventBus.dispatch("reader.book.completed", {
          userId: "u1",
          bookId: "b1",
        }),
      ).rejects.toThrow("Group handler error");

      expect(handlerOneRan).toBe(true);
    });
  });

  describe("subscribe & unsubscribe", () => {
    it("allows unsubscribing so handler is no longer invoked", async () => {
      let callCount = 0;
      const unsubscribe = eventBus.subscribe("reader.book.completed", async () => {
        callCount++;
      });

      await eventBus.dispatch("reader.book.completed", {
        userId: "u1",
        bookId: "b1",
      });
      expect(callCount).toBe(1);

      unsubscribe();

      await eventBus.dispatch("reader.book.completed", {
        userId: "u1",
        bookId: "b1",
      });
      expect(callCount).toBe(1);
    });
  });

  describe("emit", () => {
    it("executes asynchronously without blocking caller", async () => {
      let handlerRan = false;
      eventBus.subscribe("reader.book.completed", async () => {
        handlerRan = true;
      });

      eventBus.emit("reader.book.completed", {
        userId: "u1",
        bookId: "b1",
      });

      // Synchronously, handler has not yet run because it was scheduled with setTimeout 0
      expect(handlerRan).toBe(false);

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(handlerRan).toBe(true);
    });
  });

  describe("context forwarding", () => {
    it("forwards EventContext to subscribed handlers on dispatch", async () => {
      let receivedContext: any;
      eventBus.subscribe("reader.book.completed", async (_payload, context) => {
        receivedContext = context;
      });

      await eventBus.dispatch(
        "reader.book.completed",
        { userId: "u1", bookId: "b1" },
        { eventId: "ev-999", occurredAt: "2026-10-09T00:00:00Z" },
      );

      expect(receivedContext).toEqual({
        eventId: "ev-999",
        occurredAt: "2026-10-09T00:00:00Z",
      });
    });

    it("forwards EventContext to subscribed handlers on emit", async () => {
      let receivedContext: any;
      eventBus.subscribe("reader.book.completed", async (_payload, context) => {
        receivedContext = context;
      });

      eventBus.emit(
        "reader.book.completed",
        { userId: "u1", bookId: "b1" },
        { eventId: "ev-888", occurredAt: "2026-10-09T00:00:00Z" },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(receivedContext).toEqual({
        eventId: "ev-888",
        occurredAt: "2026-10-09T00:00:00Z",
      });
    });
  });
});
