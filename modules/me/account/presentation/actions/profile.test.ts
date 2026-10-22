import { getProfile, setupProfile } from "./profile";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Account Profile Actions", () => {
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

  describe("getProfile", () => {
    it("returns unauthorized when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await getProfile("user-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("rejects attempt to access another user's profile setup", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await getProfile("user-other");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });

    it("returns profile for authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { display_name: "Test User" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const res = await getProfile("user-123");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.displayName).toBe("Test User");
      }
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    });
  });

  describe("setupProfile", () => {
    it("returns unauthorized when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await setupProfile("user-1", {
        name: "Test",
        favoriteGenres: ["Fiction"],
        readingGoal: 10,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Unauthorized");
      }
    });

    it("rejects attempt to setup another user's profile", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await setupProfile("user-other", {
        name: "Test",
        favoriteGenres: ["Fiction"],
        readingGoal: 10,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });

    it("updates profile strictly bound to session user.id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      const res = await setupProfile("user-123", {
        name: "New Name",
        favoriteGenres: ["Fiction"],
        readingGoal: 10,
      });
      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ display_name: "New Name" });
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    });
  });
});
