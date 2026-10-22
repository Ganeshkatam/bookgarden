import { NotificationEventHandlers } from "./application/event-handlers/NotificationEventHandlers";
import { INotificationRepository } from "./domain/repositories/INotificationRepository";
import { NotificationPreferencesRepository } from "@/modules/me/account/notifications/domain/repositories/NotificationPreferencesRepository";
import { UserId } from "@/shared/kernel/UserId";

class MockEventBus {
  private handlers: Map<string, Array<(payload: any, context?: any) => Promise<void>>> = new Map();

  subscribe(eventName: string, handler: (payload: any, context?: any) => Promise<void>): () => void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler);
    this.handlers.set(eventName, list);
    return () => {};
  }

  emit(eventName: string, payload: any, context?: any): void {
    const list = this.handlers.get(eventName) || [];
    for (const handler of list) {
      handler(payload, context);
    }
  }
}

describe("Notification Preferences Event Filtering Integration", () => {
  let eventBus: MockEventBus;
  let mockNotificationRepo: jest.Mocked<INotificationRepository>;
  let mockPreferencesRepo: jest.Mocked<NotificationPreferencesRepository>;
  let handlers: NotificationEventHandlers;

  beforeEach(() => {
    eventBus = new MockEventBus();

    mockNotificationRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      listForUser: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      listUnreadForUser: jest.fn(),
    };

    mockPreferencesRepo = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      updateToggle: jest.fn(),
    };

    handlers = new NotificationEventHandlers(
      eventBus as any,
      mockNotificationRepo,
      mockPreferencesRepo,
    );
    handlers.register();
  });

  it("should create notifications when user preferences allow them", async () => {
    const userId = "user-active-alerts";
    mockPreferencesRepo.findByUserId.mockResolvedValue({
      userId: UserId.create(userId),
      readingRemindersEnabled: true,
      recommendationsEnabled: true,
      weeklyDigestEnabled: true,
      systemAnnouncementsEnabled: true,
      emailAlertsEnabled: true,
      pushNotificationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit level up event
    eventBus.emit("progress.level.up", {
      userId,
      level: 5,
      title: "Bibliophile",
    });

    // Wait a tick for async handler
    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        eventName: "progress.level.up",
        title: "Level Up!",
      }),
    );
  });

  it("should suppress reading/progress notifications when readingRemindersEnabled is false", async () => {
    const userId = "user-silent-mode";
    mockPreferencesRepo.findByUserId.mockResolvedValue({
      userId: UserId.create(userId),
      readingRemindersEnabled: false, // Suppressed
      recommendationsEnabled: true,
      weeklyDigestEnabled: true,
      systemAnnouncementsEnabled: true,
      emailAlertsEnabled: false,
      pushNotificationsEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Progress Level Up
    eventBus.emit("progress.level.up", {
      userId,
      level: 10,
      title: "Archivist",
    });

    // 2. Achievement Unlocked
    eventBus.emit("progress.achievement.unlocked", {
      userId,
      achievementId: "night-owl",
    });

    // 3. Book Completed
    eventBus.emit(
      "reader.book.completed",
      {
        userId,
        bookId: "book-123",
      },
      {
        eventId: "event-pref-3",
        occurredAt: new Date().toISOString(),
      },
    );

    // 4. Book Added
    eventBus.emit("library.book.added", {
      userId,
      bookId: "book-456",
      status: "to_read",
    });

    await new Promise((r) => setTimeout(r, 10));

    // None should be created
    expect(mockNotificationRepo.create).not.toHaveBeenCalled();
  });

  it("should allow notifications when no preference row exists (default behavior)", async () => {
    const userId = "user-new";
    mockPreferencesRepo.findByUserId.mockResolvedValue(null);

    eventBus.emit("progress.achievement.unlocked", {
      userId,
      achievementId: "first-book",
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        eventName: "progress.achievement.unlocked",
      }),
    );
  });
});
