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
    this.eventBus.subscribe("progress.level.up", async (payload) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        await this.notificationRepository.create({
          userId: payload.userId,
          eventName: "progress.level.up",
          aggregateId: payload.level.toString(),
          aggregateType: "level",
          type: "SUCCESS",
          title: "Level Up!",
          body: `Congratulations, you've reached level ${payload.level}: ${payload.title}!`,
          metadata: { level: payload.level, title: payload.title },
        });
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create level up notification:", error);
        throw error;
      }
    });

    // 2. Achievement Unlocked
    this.eventBus.subscribe("progress.achievement.unlocked", async (payload) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        await this.notificationRepository.create({
          userId: payload.userId,
          eventName: "progress.achievement.unlocked",
          aggregateId: payload.achievementId,
          aggregateType: "achievement",
          type: "SUCCESS",
          title: "Achievement Unlocked",
          body: "You have unlocked a new achievement! Check your learning space.",
          metadata: { achievementId: payload.achievementId },
        });
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create achievement notification:", error);
        throw error;
      }
    });

    // 3. Book Completed
    this.eventBus.subscribe("reader.book.completed", async (payload) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        await this.notificationRepository.create({
          userId: payload.userId,
          eventName: "reader.book.completed",
          aggregateId: payload.bookId,
          aggregateType: "book",
          type: "SUCCESS",
          title: "Book Completed",
          body: "You finished a book. Great work!",
          metadata: { bookId: payload.bookId },
        });
      } catch (error) {
        console.error("[NotificationEventHandlers] Failed to create book completed notification:", error);
        throw error;
      }
    });

    // 4. Book Added to Library
    this.eventBus.subscribe("library.book.added", async (payload) => {
      try {
        if (await this.isSuppressed(payload.userId, "readingRemindersEnabled")) {
          return;
        }

        await this.notificationRepository.create({
          userId: payload.userId,
          eventName: "library.book.added",
          aggregateId: payload.bookId,
          aggregateType: "library_book",
          type: "INFO",
          title: "Added to Library",
          body: "A new book has been added to your library.",
          metadata: { bookId: payload.bookId, status: payload.status },
        });
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
