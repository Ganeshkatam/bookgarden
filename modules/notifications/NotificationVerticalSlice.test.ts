import { NotificationEventHandlers } from "./application/event-handlers/NotificationEventHandlers";
import { INotificationRepository } from "./domain/repositories/INotificationRepository";
import { Notification } from "./domain/Notification";
import { IEventBus, PlatformEventName, EventPayloads } from "@/shared/core/events/types";

class TestEventBus implements IEventBus {
  private handlers: Map<string, Array<(payload: any, context?: any) => Promise<void> | void>> = new Map();

  subscribe<T extends PlatformEventName>(
    event: T,
    handler: (payload: EventPayloads[T], context?: any) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return () => {};
  }

  async publish<T extends PlatformEventName>(event: T, payload: EventPayloads[T], context?: any): Promise<void> {
    const list = this.handlers.get(event) || [];
    for (const handler of list) {
      await handler(payload, context);
    }
  }

  async dispatch<T extends PlatformEventName>(event: T, payload: EventPayloads[T], context?: any): Promise<void> {
    await this.publish(event, payload, context);
  }

  emit<T extends PlatformEventName>(event: T, payload: EventPayloads[T], context?: any): void {
    this.publish(event, payload, context);
  }
}


describe("Notifications Vertical Slice & Event Flow", () => {
  let eventBus: TestEventBus;
  let notificationsStore: Notification[];
  let repository: INotificationRepository;
  let eventHandlers: NotificationEventHandlers;

  beforeEach(() => {
    eventBus = new TestEventBus();
    notificationsStore = [];

    repository = {
      async create(dto) {
        const item: Notification = {
          id: `notif-${notificationsStore.length + 1}`,
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
        notificationsStore.push(item);
      },
      async listForUser(userId, limit = 20, offset = 0) {
        return notificationsStore
          .filter((n) => n.userId === userId)
          .slice(offset, offset + limit);
      },
      async listUnreadForUser(userId) {
        return notificationsStore.filter((n) => n.userId === userId && n.readAt === null);
      },
      async markAsRead(notificationId, userId) {
        const notif = notificationsStore.find(
          (n) => n.id === notificationId && n.userId === userId,
        );
        if (notif) {
          notif.readAt = new Date().toISOString();
        }
      },
      async markAllAsRead(userId) {
        notificationsStore
          .filter((n) => n.userId === userId && n.readAt === null)
          .forEach((n) => {
            n.readAt = new Date().toISOString();
          });
      },
      async getUnreadCount(userId) {
        return notificationsStore.filter(
          (n) => n.userId === userId && n.readAt === null,
        ).length;
      },
    };

    eventHandlers = new NotificationEventHandlers(eventBus, repository);
    eventHandlers.register();
  });

  it("should create notification when reader.book.completed event is published", async () => {
    await eventBus.publish(
      "reader.book.completed",
      {
        userId: "user-1",
        bookId: "book-100",
      },
      {
        eventId: "event-completed-1",
        occurredAt: new Date().toISOString(),
      },
    );

    const unread = await repository.listUnreadForUser("user-1");
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe("Book Completed");
    expect(unread[0].type).toBe("SUCCESS");
    expect(unread[0].metadata).toEqual({ bookId: "book-100" });
  });

  it("should create notification when library.book.added event is published", async () => {
    await eventBus.publish("library.book.added", {
      userId: "user-1",
      bookId: "book-200",
      status: "want_to_read",
    });

    const unread = await repository.listUnreadForUser("user-1");
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe("Added to Library");
    expect(unread[0].type).toBe("INFO");
  });

  it("should create notification when progress.level.up event is published", async () => {
    await eventBus.publish("progress.level.up", {
      userId: "user-1",
      level: 5,
      title: "Bibliophile",
    });

    const unread = await repository.listUnreadForUser("user-1");
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe("Level Up!");
  });

  it("should mark a single notification as read", async () => {
    await eventBus.publish(
      "reader.book.completed",
      {
        userId: "user-1",
        bookId: "book-1",
      },
      {
        eventId: "event-read-1",
        occurredAt: new Date().toISOString(),
      },
    );

    const [notif] = await repository.listUnreadForUser("user-1");
    expect(notif).toBeDefined();

    await repository.markAsRead(notif.id, "user-1");

    const unreadAfter = await repository.listUnreadForUser("user-1");
    expect(unreadAfter).toHaveLength(0);

    const all = await repository.listForUser("user-1");
    expect(all).toHaveLength(1);
    expect(all[0].readAt).not.toBeNull();
  });

  it("should mark all notifications as read for a specific user", async () => {
    await eventBus.publish("progress.level.up", {
      userId: "user-1",
      level: 2,
      title: "Novice",
    });
    await eventBus.publish("library.book.added", {
      userId: "user-1",
      bookId: "book-2",
      status: "currently_reading",
    });

    expect(await repository.getUnreadCount("user-1")).toBe(2);

    await repository.markAllAsRead("user-1");

    expect(await repository.getUnreadCount("user-1")).toBe(0);
  });

  it("should enforce user isolation: user-2 cannot view or mark user-1 notifications", async () => {
    await eventBus.publish(
      "reader.book.completed",
      {
        userId: "user-1",
        bookId: "book-secret",
      },
      {
        eventId: "event-iso-1",
        occurredAt: new Date().toISOString(),
      },
    );

    // User 2 sees nothing
    const user2Unread = await repository.listUnreadForUser("user-2");
    expect(user2Unread).toHaveLength(0);
    expect(await repository.getUnreadCount("user-2")).toBe(0);

    // User 2 tries to mark User 1 notification
    const [user1Notif] = await repository.listUnreadForUser("user-1");
    await repository.markAsRead(user1Notif.id, "user-2");

    // User 1 notification remains unread
    expect(await repository.getUnreadCount("user-1")).toBe(1);
  });

  it("propagates repository creation failure to dispatcher instead of silently swallowing it", async () => {
    jest.spyOn(repository, "create").mockRejectedValueOnce(
      new Error("Database connection lost during notification insert"),
    );

    await expect(
      eventBus.dispatch(
        "reader.book.completed",
        {
          userId: "user-fail",
          bookId: "book-fail",
        },
        {
          eventId: "event-fail-1",
          occurredAt: new Date().toISOString(),
        },
      ),
    ).rejects.toThrow("Database connection lost during notification insert");
  });

  it("forwards eventId and handlerName to repository.create when dispatched with event context", async () => {
    const createSpy = jest.spyOn(repository, "create");

    await eventBus.dispatch(
      "reader.book.completed",
      {
        userId: "user-idempotent",
        bookId: "book-idempotent",
      },
      {
        eventId: "event-uuid-789",
        occurredAt: new Date().toISOString(),
      },
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-idempotent",
        eventName: "reader.book.completed",
      }),
      {
        eventId: "event-uuid-789",
        handlerName: "NotificationEventHandlers.readerBookCompleted",
      },
    );
  });
});
