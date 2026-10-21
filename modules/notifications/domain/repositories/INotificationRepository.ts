import { Notification } from "../Notification";

export interface NotificationIdempotency {
  eventId?: string;
  handlerName?: string;
}

/**
 * Domain repository contract for notification persistence.
 *
 * Handlers and use cases depend on this interface rather than on any
 * infrastructure client, keeping the domain free of Supabase or raw-SQL
 * coupling.
 */
export interface INotificationRepository {
  /**
   * Persists a new notification.
   * The repository is responsible for generating the `id` and `createdAt`
   * fields; callers provide domain-level data only.
   * Accepts optional idempotency metadata (eventId, handlerName) to guarantee
   * transactional, deduplicated insertion against public.processed_events.
   */
  create(
    notification: Omit<Notification, "id" | "createdAt" | "readAt">,
    idempotency?: NotificationIdempotency,
  ): Promise<void>;

  /**
   * Returns a paginated list of notifications for a user, newest first.
   */
  listForUser(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Notification[]>;

  /**
   * Marks a single notification as read for the owning user.
   */
  markAsRead(notificationId: string, userId: string): Promise<void>;

  /**
   * Marks all unread notifications as read for a user.
   */
  markAllAsRead(userId: string): Promise<void>;

  /**
   * Returns the number of unread notifications for a user.
   */
  getUnreadCount(userId: string): Promise<number>;

  /**
   * Returns all unread notifications for a user, newest first.
   */
  listUnreadForUser(userId: string): Promise<Notification[]>;
}
