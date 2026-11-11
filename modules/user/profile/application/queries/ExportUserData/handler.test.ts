import { ExportUserDataHandler } from "./handler";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";

describe("ExportUserDataHandler", () => {
  it("should query all user data tables including annotations and return structured export", async () => {
    const mockFrom = jest.fn();

    const mockSelect = (tableName: string) => {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((col: string, val: string) => {
          if (tableName === "profiles") {
            return {
              maybeSingle: jest.fn().mockResolvedValue({ id: val, username: "reader1" }),
            };
          }
          if (tableName === "annotations") {
            return Promise.resolve([{ id: "ann-1", body_markdown: "Note", user_id: val }]);
          }
          return Promise.resolve([{ id: `${tableName}-1`, user_id: val }]);
        }),
      };
    };

    mockFrom.mockImplementation((tableName: string) => mockSelect(tableName));

    const mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient<Database>;

    const handler = new ExportUserDataHandler(mockSupabase);
    const result = await handler.execute({ userId: "user-123" });

    expect(result.user_id).toBe("user-123");
    expect(result.annotations).toEqual([
      { id: "ann-1", body_markdown: "Note", user_id: "user-123" },
    ]);
    expect(result.library_books).toBeDefined();
    expect(result.collections).toBeDefined();
    expect(result.bookmarks).toBeDefined();
    expect(result.highlights).toBeDefined();
    expect(result.reading_sessions).toBeDefined();
    expect(result.reading_positions).toBeDefined();
  });
});

