import {
  deleteFileFromStorage,
  grantUserPermissionAction,
} from "./storage";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");
jest.mock("@/shared/infrastructure/identity/SupabaseIdentityProvider", () => ({
  SupabaseIdentityProvider: jest.fn().mockImplementation((supabase) => ({
    currentUser: jest.fn().mockImplementation(async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    }),
  })),
}));

jest.mock("@/modules/authorization/infrastructure/SupabaseAuthorizationRepository", () => ({
  SupabaseAuthorizationRepository: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockResolvedValue(false),
  })),
}));

describe("Storage Presentation Actions", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      storage: {
        from: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    };
    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("deleteFileFromStorage", () => {
    it("returns unauthorized when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await deleteFileFromStorage("user-images", "test.jpg");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Not authenticated");
      }
    });

    it("rejects non-whitelisted buckets", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteFileFromStorage("private-books", "user-123/book.epub");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Invalid or unauthorized storage bucket");
      }
    });

    it("rejects path traversal attempts", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteFileFromStorage("user-images", "../../../etc/passwd");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Path traversal detected");
      }
    });

    it("rejects null bytes in path", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteFileFromStorage("user-images", "user-123/avatar\0.png");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Invalid path format");
      }
    });

    it("rejects cross-user file deletion for regular users in user-images", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const res = await deleteFileFromStorage("user-images", "other-user/avatar.png");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });

    it("allows user to delete their own file in user-images", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({ remove: mockRemove });

      const res = await deleteFileFromStorage("user-images", "user-123/avatar.png");
      expect(res.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("user-images");
      expect(mockRemove).toHaveBeenCalledWith(["user-123/avatar.png"]);
    });

    it("rejects cross-user avatar deletion when user does not own the avatar", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { avatar_url: "https://example.com/avatars/user-123/my-avatar.png" } }),
            like: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      });

      const res = await deleteFileFromStorage("avatars", "other-user-avatar.png");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });

    it("allows deleting avatar when it matches user profile avatar_url", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { avatar_url: "https://example.com/avatars/my-avatar.png" } }),
          }),
        }),
      });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({ remove: mockRemove });

      const res = await deleteFileFromStorage("avatars", "my-avatar.png");
      expect(res.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("avatars");
      expect(mockRemove).toHaveBeenCalledWith(["my-avatar.png"]);
    });
  });

  describe("grantUserPermissionAction", () => {
    it("returns unauthorized when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const res = await grantUserPermissionAction();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Not authenticated");
      }
    });

    it("rejects non-admin caller with forbidden", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-regular" } },
        error: null,
      });

      const res = await grantUserPermissionAction();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });
  });
});
