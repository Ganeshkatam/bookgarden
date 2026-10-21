import { SupabaseClient } from "@supabase/supabase-js";
import {
  INotificationRepository,
  NotificationIdempotency,
} from "../domain/repositories/INotificationRepository";
import { Notification } from "../domain/Notification";

/**
 * Maps a Supabase row into the domain Notification shape.
 */
function toDomain(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    eventName: row.event_name,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class SupabaseNotificationRepository implements INotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(
    notification: Omit<Notification, "id" | "createdAt" | "readAt">,
    idempotency?: NotificationIdempotency,
  ): Promise<void> {
    if (idempotency?.eventId) {
      const { error } = await this.supabase.rpc("create_notification_idempotent" as any, {
        p_event_id: idempotency.eventId,
        p_handler: idempotency.handlerName || "NotificationHandler",
        p_user_id: notification.userId,
        p_event_name: notification.eventName,
        p_aggregate_id: notification.aggregateId,
        p_aggregate_type: notification.aggregateType,
        p_type: notification.type,
        p_title: notification.title,
        p_body: notification.body,
        p_metadata: notification.metadata || {},
      });

      if (error) {
        console.error(
          "[SupabaseNotificationRepository] Failed to create idempotent notification:",
          error,
        );
        throw error;
      }
      return;
    }

    const { error } = await this.supabase.from("notifications").insert({
      user_id: notification.userId,
      event_name: notification.eventName,
      aggregate_id: notification.aggregateId,
      aggregate_type: notification.aggregateType,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
    });

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to create notification:", error);
      throw error;
    }
  }

  async listForUser(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to list notifications:", error);
      throw error;
    }

    return (data || []).map(toDomain);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to mark as read:", error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to mark all as read:", error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to get unread count:", error);
      throw error;
    }

    return count || 0;
  }

  async listUnreadForUser(userId: string): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SupabaseNotificationRepository] Failed to list unread notifications:", error);
      throw error;
    }

    return (data || []).map(toDomain);
  }
}
