import {
  NotificationEventHandlers,
  isRecentNotificationEvent,
  MAX_NOTIFICATION_EVENT_AGE_MS,
} from "./NotificationEventHandlers";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";
import { Notification } from "../../domain/Notification";
import { IEventBus, PlatformEventName, EventPayloads, EventContext } from "@/shared/core/events/types";

class MockEventBus implements IEventBus {
  private handlers: Map<
    string,
    Array<(payload: any, context?: EventContext) => Promise<void> | void>
  > = new Map();

  subscribe<T extends PlatformEventName>(
    event: T,
    handler: (payload: EventPayloads[T], context?: EventContext) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return () => {};
  }

  async dispatch<T extends PlatformEventName>(
    event: T,
    payload: EventPayloads[T],
    context?: EventContext,
  ): Promise<void> {
    const list = this.handlers.get(event) || [];
    for (const handler of list) {
      await handler(payload, context);
    }
  }

  emit<T extends PlatformEventName>(
    event: T,
    payload: EventPayloads[T],
    context?: EventContext,
  ): void {
    this.dispatch(event, payload, context);
  }
}

describe("Priority 5 — Notification Replay Safety", () => {
  describe("isRecentNotificationEvent pure function", () => {
    const now = 1792688400000; // Fixed reference timestamp (2026-10-22T16:40:00.000Z)

    it("accepts recent events occurring within the 24-hour window", () => {
      // 5 minutes ago
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(fiveMinutesAgo, now)).toBe(true);

      // 12 hours ago
      const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(twelveHoursAgo, now)).toBe(true);

      // 23 hours and 59 minutes ago
      const almostOneDayAgo = new Date(now - (24 * 60 - 1) * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(almostOneDayAgo, now)).toBe(true);

      // Exactly now (0 ms difference)
      const exactlyNow = new Date(now).toISOString();
      expect(isRecentNotificationEvent(exactlyNow, now)).toBe(true);

      // Exact 24-hour boundary (86,400,000 ms ago)
      const exactBoundary = new Date(now - MAX_NOTIFICATION_EVENT_AGE_MS).toISOString();
      expect(isRecentNotificationEvent(exactBoundary, now)).toBe(true);
    });

    it("suppresses events older than 24 hours", () => {
      // 24 hours + 1 millisecond
      const justOver24Hours = new Date(now - (MAX_NOTIFICATION_EVENT_AGE_MS + 1)).toISOString();
      expect(isRecentNotificationEvent(justOver24Hours, now)).toBe(false);

      // 25 hours ago
      const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(twentyFiveHoursAgo, now)).toBe(false);

      // 7 days ago
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(sevenDaysAgo, now)).toBe(false);

      // Real outbox backlog events from August / September 2026 (>40 days old)
      expect(isRecentNotificationEvent("2026-08-20T10:15:30.000Z", now)).toBe(false);
      expect(isRecentNotificationEvent("2026-09-08T18:00:00.000Z", now)).toBe(false);
    });

    it("suppresses events with future timestamps", () => {
      // 10 seconds in the future
      const tenSecondsFuture = new Date(now + 10 * 1000).toISOString();
      expect(isRecentNotificationEvent(tenSecondsFuture, now)).toBe(false);

      // 1 hour in the future
      const oneHourFuture = new Date(now + 60 * 60 * 1000).toISOString();
      expect(isRecentNotificationEvent(oneHourFuture, now)).toBe(false);

      // Far future year
      expect(isRecentNotificationEvent("2099-01-01T00:00:00.000Z", now)).toBe(false);
    });

    it("suppresses missing timestamps conservatively without bypassing", () => {
      expect(isRecentNotificationEvent(undefined, now)).toBe(false);
      expect(isRecentNotificationEvent(null, now)).toBe(false);
      expect(isRecentNotificationEvent("", now)).toBe(false);
      expect(isRecentNotificationEvent("   ", now)).toBe(false);
    });

    it("suppresses malformed and invalid timestamps conservatively without bypassing", () => {
      expect(isRecentNotificationEvent("not-a-valid-date", now)).toBe(false);
      expect(isRecentNotificationEvent("2026-99-99T99:99:99Z", now)).toBe(false);
      expect(isRecentNotificationEvent("invalid", now)).toBe(false);
      expect(isRecentNotificationEvent("NaN", now)).toBe(false);
      expect(isRecentNotificationEvent(123456 as any, now)).toBe(false);
    });

    it("delegates static class helper NotificationEventHandlers.isRecentEvent identically", () => {
      const recent = new Date(now - 1000).toISOString();
      const stale = new Date(now - 25 * 60 * 60 * 1000).toISOString();

      expect(NotificationEventHandlers.isRecentEvent(recent, now)).toBe(true);
      expect(NotificationEventHandlers.isRecentEvent(stale, now)).toBe(false);
    });
  });

  describe("NotificationEventHandlers integration and replay safety", () => {
    let eventBus: MockEventBus;
    let createdNotifications: Notification[];
    let processedEventClaims: Set<string>;
    let mockRepository: INotificationRepository;
    let handlers: NotificationEventHandlers;

    beforeEach(() => {
      eventBus = new MockEventBus();
      createdNotifications = [];
      processedEventClaims = new Set();

      // Mock repository implements idempotent create semantics matching create_notification_idempotent RPC
      mockRepository = {
        create: jest.fn().mockImplementation(async (dto, idempotency) => {
          if (idempotency?.eventId) {
            const claimKey = `${idempotency.eventId}:${idempotency.handlerName}`;
            if (processedEventClaims.has(claimKey)) {
              // Deduplication: already processed by this handler, no-op
              return;
            }
            processedEventClaims.add(claimKey);
          }

          const notification: Notification = {
            id: `notif-${createdNotifications.length + 1}`,
            userId: dto.userId,
            eventName: dto.eventName,
            aggregateId: dto.aggregateId,
            aggregateType: dto.aggregateType,
            type: dto.type,
            title: dto.title,
            body: dto.body,
            metadata: dto.metadata || {},
            readAt: null,
            createdAt: new Date().toISOString(),
          };
          createdNotifications.push(notification);
        }),
        listForUser: jest.fn(),
        listUnreadForUser: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        getUnreadCount: jest.fn(),
      };

      handlers = new NotificationEventHandlers(eventBus, mockRepository);
      handlers.register();
    });

    it("creates notification for a recent reader.book.completed event (<24 hours old)", async () => {
      const recentOccurredAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      await eventBus.dispatch(
        "reader.book.completed",
        {
          userId: "user-reader-1",
          bookId: "book-recent-1",
        },
        {
          eventId: "evt-recent-100",
          occurredAt: recentOccurredAt,
        },
      );

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-reader-1",
          eventName: "reader.book.completed",
          title: "Book Completed",
          aggregateId: "book-recent-1",
          aggregateType: "book",
        }),
        {
          eventId: "evt-recent-100",
          handlerName: "NotificationEventHandlers.readerBookCompleted",
        },
      );
      expect(createdNotifications).toHaveLength(1);
    });

    it("suppresses stale reader.book.completed notifications (>24 hours old) without throwing", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const staleOccurredAt = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30 hours ago

      // Must complete successfully to preserve event acknowledgements for outbox relay
      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-stale-1",
            bookId: "book-stale-1",
          },
          {
            eventId: "evt-stale-200",
            occurredAt: staleOccurredAt,
          },
        ),
      ).resolves.not.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(createdNotifications).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Suppressing stale or invalid notification for reader.book.completed"),
      );

      warnSpy.mockRestore();
    });

    it("suppresses historical backlog events (e.g. August 2026 outbox items) during outbox replay", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-backlog-1",
            bookId: "book-backlog-1",
          },
          {
            eventId: "01918a2b-9800-7212-9cbb-927bb1278142",
            occurredAt: "2026-08-20T10:15:30.000Z",
          },
        ),
      ).resolves.not.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(createdNotifications).toHaveLength(0);

      warnSpy.mockRestore();
    });

    it("suppresses events with future timestamps without throwing", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const futureOccurredAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours in future

      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-future-1",
            bookId: "book-future-1",
          },
          {
            eventId: "evt-future-300",
            occurredAt: futureOccurredAt,
          },
        ),
      ).resolves.not.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(createdNotifications).toHaveLength(0);

      warnSpy.mockRestore();
    });

    it("suppresses events with missing or undefined context without throwing", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      // Missing context completely
      await expect(
        eventBus.dispatch("reader.book.completed", {
          userId: "user-missing-ctx",
          bookId: "book-missing-ctx",
        }),
      ).resolves.not.toThrow();

      // Context present but occurredAt undefined
      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-missing-timestamp",
            bookId: "book-missing-timestamp",
          },
          {
            eventId: "evt-no-timestamp",
          },
        ),
      ).resolves.not.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(createdNotifications).toHaveLength(0);

      warnSpy.mockRestore();
    });

    it("suppresses events with malformed timestamps without throwing", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-malformed",
            bookId: "book-malformed",
          },
          {
            eventId: "evt-malformed-1",
            occurredAt: "not-a-valid-date-string",
          },
        ),
      ).resolves.not.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(createdNotifications).toHaveLength(0);

      warnSpy.mockRestore();
    });

    it("handles duplicate event delivery idempotently without creating duplicate notifications", async () => {
      const recentOccurredAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const duplicateEventId = "evt-duplicate-uuid-999";

      const eventPayload = {
        userId: "user-idempotent-flow",
        bookId: "book-idempotent-flow",
      };

      const eventContext = {
        eventId: duplicateEventId,
        occurredAt: recentOccurredAt,
      };

      // First delivery
      await eventBus.dispatch("reader.book.completed", eventPayload, eventContext);
      expect(createdNotifications).toHaveLength(1);

      // Replay / second delivery of the same event
      await eventBus.dispatch("reader.book.completed", eventPayload, eventContext);

      // Repository create was called with identical eventId and handlerName
      expect(mockRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        {
          eventId: duplicateEventId,
          handlerName: "NotificationEventHandlers.readerBookCompleted",
        },
      );
      expect(mockRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        {
          eventId: duplicateEventId,
          handlerName: "NotificationEventHandlers.readerBookCompleted",
        },
      );

      // Due to idempotency claim, only 1 notification was persisted
      expect(createdNotifications).toHaveLength(1);
    });

    it("does not suppress unrelated events (progress.level.up, library.book.added)", async () => {
      await eventBus.dispatch("progress.level.up", {
        userId: "user-level-up",
        level: 3,
        title: "Book Explorer",
      });

      await eventBus.dispatch("library.book.added", {
        userId: "user-library-add",
        bookId: "book-unrelated-1",
        status: "reading",
      });

      expect(createdNotifications).toHaveLength(2);
      expect(createdNotifications[0].title).toBe("Level Up!");
      expect(createdNotifications[1].title).toBe("Added to Library");
    });

    it("propagates repository errors on valid recent events for proper outbox retry handling", async () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      (mockRepository.create as jest.Mock).mockRejectedValueOnce(
        new Error("Connection terminated by peer"),
      );

      await expect(
        eventBus.dispatch(
          "reader.book.completed",
          {
            userId: "user-retryable",
            bookId: "book-retryable",
          },
          {
            eventId: "evt-retryable-1",
            occurredAt: new Date().toISOString(),
          },
        ),
      ).rejects.toThrow("Connection terminated by peer");

      errorSpy.mockRestore();
    });
  });
});
