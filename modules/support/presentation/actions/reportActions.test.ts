jest.mock("server-only", () => ({}), { virtual: true });

import { submitReportAction } from "./reportActions";
import * as serverDbModule from "@/shared/core/database/server";
import { headers } from "next/headers";

jest.mock("@/shared/core/database/server");
jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

describe("submitReportAction Server Action", () => {
  let mockSupabase: any;
  let mockHeaders: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHeaders = {
      get: jest.fn().mockImplementation((header: string) => {
        if (header === "x-forwarded-for") return "192.168.1.100";
        return null;
      }),
    };
    (headers as jest.Mock).mockResolvedValue(mockHeaders);

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-reporting-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("should process valid report submission from authenticated user", async () => {
    const formData = new FormData();
    formData.append("type", "BUG");
    formData.append("title", "Broken reader theme toggle");
    formData.append("description", "Theme reverts back to dark when navigating chapters.");
    formData.append("email", "reader@bookgarden.tomesphere.in");

    const result = await submitReportAction(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBeDefined();
    }

    expect(mockSupabase.from).toHaveBeenCalledWith("platform_reports");
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUG",
        title: "Broken reader theme toggle",
        user_id: "user-reporting-1",
        email: "reader@bookgarden.tomesphere.in",
      }),
    );
  });

  it("should process valid report submission from anonymous user using IP for rate limit", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const formData = new FormData();
    formData.append("type", "SECURITY");
    formData.append("title", "CORS policy misconfiguration");
    formData.append("description", "Wildcard origin detected on internal endpoint.");

    const result = await submitReportAction(formData);

    expect(result.success).toBe(true);
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SECURITY",
        user_id: null,
      }),
    );
  });

  it("should reject report when payload validation fails", async () => {
    const formData = new FormData();
    formData.append("type", "INVALID");
    formData.append("title", "");
    formData.append("description", "");

    const result = await submitReportAction(formData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
