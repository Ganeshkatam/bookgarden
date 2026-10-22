import { deleteAccountAction, signOutAllDevicesAction } from "./security";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");

describe("Account Security Actions", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn(),
    };
    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("deleteAccountAction", () => {
    it("returns unauthorized when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth session missing" },
      });

      const res = await deleteAccountAction({ confirmationText: "DELETE" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("rejects invalid confirmation text", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteAccountAction({ confirmationText: "WRONG" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain('Please type "DELETE" to confirm');
      }
    });

    it("rejects attempt to delete another user id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteAccountAction({
        userId: "user-999",
        confirmationText: "DELETE",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });

    it("successfully deletes profile and revokes global sessions", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const res = await deleteAccountAction({ confirmationText: "DELETE" });
      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    });
  });

  describe("signOutAllDevicesAction", () => {
    it("returns unauthorized when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await signOutAllDevicesAction();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("calls signOut with scope others when authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await signOutAllDevicesAction();
      expect(res.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "others" });
    });
  });
});
