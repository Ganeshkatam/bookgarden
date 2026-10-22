import { IEventBus } from "@/shared/core/events/types";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";
import { INotificationPreferencesRepository } from "../../domain/repositories/INotificationPreferencesRepository";
import { UserId } from "@/shared/kernel/UserId";

export const MAX_NOTIFICATION_EVENT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates whether an event occurrence timestamp represents a recent event (within 24 hours).
 *
 * Conservative evaluation rules:
 * - Missing, null, undefined, or empty timestamps return false (must not bypass suppression).
 * - Malformed timestamps (unparseable / NaN) return false.
 * - Future timestamps (strictly greater than current evaluation time) return false.
 * - Timestamps older than 24 hours return false.
 *
 * @param occurredAt ISO timestamp string or null/undefined
 * @param now Epoch milliseconds representing evaluation time (defaults to Date.now())
 */
export function isRecentNotificationEvent(
  occurredAt?: string | null,
  now: number = Date.now(),
): boolean {
  if (!occurredAt || typeof occurredAt !== "string" || occurredAt.trim().length === 0) {
    return false;
  }

  const eventTime = Date.parse(occurredAt);
  if (Number.isNaN(eventTime)) {
    return false;
  }

  const ageMs = now - eventTime;
  // Events must have occurred in the past within 24 hours: 0 <= ageMs <= 24 hours
  return ageMs >= 0 && ageMs <= MAX_NOTIFICATION_EVENT_AGE_MS;
}

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

  public static isRecentEvent(occurredAt?: string | null, now?: number): boolean {
    return isRecentNotificationEvent(occurredAt, now);
  }

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
        // Suppress stale notifications: check context.occurredAt before sending.
        // Events older than 24h, future timestamps, or invalid/missing timestamps are suppressed.
        if (!isRecentNotificationEvent(context?.occurredAt)) {
          console.warn(
            `[NotificationEventHandlers] Suppressing stale or invalid notification for reader.book.completed ` +
            `(eventId: ${context?.eventId || "none"}, occurredAt: ${context?.occurredAt || "missing"})`,
          );
          return;
        }

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
