import { IEventBus } from "@/shared/core/events/types";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";
import { INotificationPreferencesRepository } from "../../domain/repositories/INotificationPreferencesRepository";
import { UserId } from "@/shared/kernel/UserId";

/**
 * Subscribes to domain events and creates notifications through the
 * domain repository contract after evaluating user notification preferences.
 */
export class NotificationEventHandlers {
  constructor(
    private eventBus: IEventBus,
    private notificationRepository: INotificationRepository,
    private preferencesRepository?: INotificationPreferencesRepository,
  ) {}

  public register(): void {
    // 1. Progress Level Up
    this.eventBus.subscribe("progress.level.up", async (payload, context) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        const data = {
          userId: payload.userId,
          eventName: "progress.level.up",
          aggregateId: payload.level.toString(),
          aggregateType: "level",
          type: "SUCCESS" as const,
          title: "Level Up!",
          body: `Congratulations, you've reached level ${payload.level}: ${payload.title}!`,
          metadata: { level: payload.level, title: payload.title },
        };

        if (context?.eventId) {
          await this.notificationRepository.create(data, {
            eventId: context.eventId,
            handlerName: "NotificationEventHandlers.progressLevelUp",
          });
        } else {
          await this.notificationRepository.create(data);
        }
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create level up notification:", error);
        throw error;
      }
    });

    // 2. Achievement Unlocked
    this.eventBus.subscribe("progress.achievement.unlocked", async (payload, context) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        const data = {
          userId: payload.userId,
          eventName: "progress.achievement.unlocked",
          aggregateId: payload.achievementId,
          aggregateType: "achievement",
          type: "SUCCESS" as const,
          title: "Achievement Unlocked",
          body: "You have unlocked a new achievement! Check your learning space.",
          metadata: { achievementId: payload.achievementId },
        };

        if (context?.eventId) {
          await this.notificationRepository.create(data, {
            eventId: context.eventId,
            handlerName: "NotificationEventHandlers.progressAchievementUnlocked",
          });
        } else {
          await this.notificationRepository.create(data);
        }
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create achievement notification:", error);
        throw error;
      }
    });

    // 3. Book Completed
    this.eventBus.subscribe("reader.book.completed", async (payload, context) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        const data = {
          userId: payload.userId,
          eventName: "reader.book.completed",
          aggregateId: payload.bookId,
          aggregateType: "book",
          type: "SUCCESS" as const,
          title: "Book Completed",
          body: "You finished a book. Great work!",
          metadata: { bookId: payload.bookId },
        };

        if (context?.eventId) {
          await this.notificationRepository.create(data, {
            eventId: context.eventId,
            handlerName: "NotificationEventHandlers.readerBookCompleted",
          });
        } else {
          await this.notificationRepository.create(data);
        }
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create book completed notification:", error);
        throw error;
      }
    });

    // 4. Book Added to Library
    this.eventBus.subscribe("library.book.added", async (payload, context) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        const data = {
          userId: payload.userId,
          eventName: "library.book.added",
          aggregateId: payload.bookId,
          aggregateType: "library_book",
          type: "INFO" as const,
          title: "Added to Library",
          body: "A new book has been added to your library.",
          metadata: { bookId: payload.bookId, status: payload.status },
        };

        if (context?.eventId) {
          await this.notificationRepository.create(data, {
            eventId: context.eventId,
            handlerName: "NotificationEventHandlers.libraryBookAdded",
          });
        } else {
          await this.notificationRepository.create(data);
        }
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create library book notification:", error);
        throw error;
      }
    });
  }

  private async isSuppressed(
    userId: string,
    preferenceKey:
      | "readingRemindersEnabled"
      | "recommendationsEnabled"
      | "systemAnnouncementsEnabled"
      | "weeklyDigestEnabled",
  ): Promise<boolean> {
    if (!this.preferencesRepository) return false;
    try {
      const prefs = await this.preferencesRepository.findByUserId(UserId.create(userId));
      if (!prefs) return false;
      return prefs[preferenceKey] === false;
    } catch {
      // In case of transient failure, fail open
      return false;
    }
  }
}
