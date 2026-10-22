import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationAction,
} from "./notifications";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");

describe("User Profile Notification Actions", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("markNotificationAsRead", () => {
    it("returns unauthorized when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await markNotificationAsRead("notif-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("updates notification scoped to id and user_id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockEqUserId = jest.fn().mockResolvedValue({ error: null });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqId });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      const res = await markNotificationAsRead("notif-1");
      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
      expect(mockUpdate).toHaveBeenCalledWith({ read: true });
      expect(mockEqId).toHaveBeenCalledWith("id", "notif-1");
      expect(mockEqUserId).toHaveBeenCalledWith("user_id", "user-123");
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("returns unauthorized when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await markAllNotificationsAsRead();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("updates all notifications scoped to user_id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockEqUserId = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUserId });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      const res = await markAllNotificationsAsRead();
      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
      expect(mockUpdate).toHaveBeenCalledWith({ read: true });
      expect(mockEqUserId).toHaveBeenCalledWith("user_id", "user-123");
    });
  });

  describe("deleteNotificationAction", () => {
    it("returns unauthorized when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await deleteNotificationAction("notif-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("deletes notification scoped to id and user_id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockEqUserId = jest.fn().mockResolvedValue({ error: null });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqId });
      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const res = await deleteNotificationAction("notif-1");
      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
      expect(mockEqId).toHaveBeenCalledWith("id", "notif-1");
      expect(mockEqUserId).toHaveBeenCalledWith("user_id", "user-123");
    });
  });
});
