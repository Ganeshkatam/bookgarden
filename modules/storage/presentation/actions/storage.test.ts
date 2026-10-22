import {
  deleteFileFromStorage,
  grantUserPermissionAction,
  uploadFileToStorage,
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

    it("allows user to delete their own file in shelves using user.id prefix", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({ remove: mockRemove });

      const res = await deleteFileFromStorage("shelves", "user-123/shelf-cover.png");
      expect(res.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("shelves");
      expect(mockRemove).toHaveBeenCalledWith(["user-123/shelf-cover.png"]);
    });

    it("rejects cross-user shelf deletion when user does not own the shelf prefix", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            like: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      });

      const res = await deleteFileFromStorage("shelves", "other-user/shelf-cover.png");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Forbidden");
      }
    });
  });

  describe("uploadFileToStorage", () => {
    const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const spoofedExeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

    it("returns unauthorized when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "No session" },
      });

      const formData = new FormData();
      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Not authenticated");
      }
    });

    it("rejects catalog buckets such as book-pdfs and book-covers", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const formData = new FormData();
      const resPdfs = await uploadFileToStorage("book-pdfs", formData);
      expect(resPdfs.success).toBe(false);
      if (!resPdfs.success) {
        expect(resPdfs.error.message).toContain("Invalid or unauthorized storage bucket");
      }

      const resCovers = await uploadFileToStorage("book-covers", formData);
      expect(resCovers.success).toBe(false);
      if (!resCovers.success) {
        expect(resCovers.error.message).toContain("Invalid or unauthorized storage bucket");
      }
    });

    it("rejects empty or missing file", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const formData = new FormData();
      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("No file provided");
      }
    });

    it("rejects file exceeding size limit for bucket", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const largeBuffer = new Uint8Array(3 * 1024 * 1024);
      largeBuffer[0] = 0xff;
      largeBuffer[1] = 0xd8;
      largeBuffer[2] = 0xff;
      largeBuffer[3] = 0xe0;
      const largeFile = new File([largeBuffer], "large.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", largeFile);

      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("File size exceeds allowed limit");
      }
    });

    it("rejects disallowed MIME type header", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const pdfFile = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "document.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Invalid file type");
      }
    });

    it("rejects spoofed file failing magic-bytes validation (e.g. executable disguised as image/jpeg)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const spoofedFile = new File([spoofedExeBytes], "malware.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", spoofedFile);

      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Invalid file content: signature does not match allowed image format");
      }
    });

    it("successfully uploads valid image to avatars with user.id/ prefix", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/storage/v1/object/public/avatars/user-123/avatar.jpg" },
      });
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const validFile = new File([validJpegBytes], "avatar.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", validFile);

      const res = await uploadFileToStorage("avatars", formData);
      expect(res.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("avatars");
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/avatar_\d+_[a-z0-9]+\.jpg$/),
        validFile,
        expect.anything()
      );
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
