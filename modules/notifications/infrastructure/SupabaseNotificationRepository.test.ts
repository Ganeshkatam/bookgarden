import { SupabaseNotificationRepository } from "./SupabaseNotificationRepository";

describe("SupabaseNotificationRepository", () => {
  let mockSupabase: any;
  let repository: SupabaseNotificationRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
      rpc: jest.fn().mockResolvedValue({ error: null }),
    };
    repository = new SupabaseNotificationRepository(mockSupabase);
  });

  describe("create", () => {
    const notificationPayload = {
      userId: "user-uuid-1",
      eventName: "reader.book.completed",
      aggregateId: "book-uuid-2",
      aggregateType: "book",
      type: "SUCCESS" as const,
      title: "Book Completed",
      body: "You finished a book.",
      metadata: { bookId: "book-uuid-2" },
    };

    it("invokes create_notification_idempotent RPC when eventId is provided", async () => {
      await repository.create(notificationPayload, {
        eventId: "event-uuid-100",
        handlerName: "NotificationEventHandlers.readerBookCompleted",
      });

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("create_notification_idempotent", {
        p_event_id: "event-uuid-100",
        p_handler: "NotificationEventHandlers.readerBookCompleted",
        p_user_id: "user-uuid-1",
        p_event_name: "reader.book.completed",
        p_aggregate_id: "book-uuid-2",
        p_aggregate_type: "book",
        p_type: "SUCCESS",
        p_title: "Book Completed",
        p_body: "You finished a book.",
        p_metadata: { bookId: "book-uuid-2" },
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("throws error when create_notification_idempotent RPC fails", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: new Error("RPC create_notification_idempotent failed"),
      });

      await expect(
        repository.create(notificationPayload, {
          eventId: "event-uuid-100",
          handlerName: "NotificationEventHandlers.readerBookCompleted",
        }),
      ).rejects.toThrow("RPC create_notification_idempotent failed");
    });

    it("falls back to standard insert when eventId is not provided", async () => {
      await repository.create(notificationPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("throws error when standard insert fails", async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({
          error: new Error("Direct insert failed"),
        }),
      });

      await expect(repository.create(notificationPayload)).rejects.toThrow("Direct insert failed");
    });
  });
});
