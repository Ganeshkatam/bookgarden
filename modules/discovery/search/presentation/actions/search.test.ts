import { searchBooks } from "./search";
import { createSupabaseServerClient } from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");

describe("searchBooks Server Action — Page Size & Pagination Verification", () => {
  let mockRpc: jest.Mock;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc = jest.fn();
    mockSupabase = {
      rpc: mockRpc,
    };
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("passes p_page_size: 20 to execute_book_search_v1 and returns pageSize: 20", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          book_id: "book-1",
          title: "The Odyssey",
          subtitle: null,
          authors: [{ id: "a1", name: "Homer" }],
          average_rating: 4.8,
          total_count: 45,
        },
      ],
      error: null,
    });

    const result = await searchBooks("Odyssey", "epic", 1);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(mockRpc).toHaveBeenCalledWith("execute_book_search_v1", {
      p_query: "Odyssey",
      p_genres: ["epic"],
      p_page: 1,
      p_page_size: 20,
      p_include_unavailable: false,
      p_languages: [],
      p_publication_years: [],
      p_sort: "relevance",
      p_subjects: [],
    });

    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(20);
    expect(result.data.count).toBe(45);
    expect(result.data.hasMore).toBe(true); // 1 * 20 < 45 -> true
  });

  it("computes hasMore correctly across page boundaries", async () => {
    // Page 2: 2 * 20 = 40 < 45 -> hasMore: true
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          book_id: "book-21",
          title: "Book 21",
          authors: [],
          total_count: 45,
        },
      ],
      error: null,
    });

    const resPage2 = await searchBooks("Odyssey", "", 2);
    expect(resPage2.success).toBe(true);
    if (resPage2.success) {
      expect(resPage2.data.page).toBe(2);
      expect(resPage2.data.pageSize).toBe(20);
      expect(resPage2.data.hasMore).toBe(true);
    }

    // Page 3: 3 * 20 = 60 < 45 -> hasMore: false
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          book_id: "book-41",
          title: "Book 41",
          authors: [],
          total_count: 45,
        },
      ],
      error: null,
    });

    const resPage3 = await searchBooks("Odyssey", "", 3);
    expect(resPage3.success).toBe(true);
    if (resPage3.success) {
      expect(resPage3.data.page).toBe(3);
      expect(resPage3.data.pageSize).toBe(20);
      expect(resPage3.data.hasMore).toBe(false);
    }
  });

  it("sanitizes page inputs below 1 to default page 1", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await searchBooks("test", "", -5);
    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "execute_book_search_v1",
      expect.objectContaining({
        p_page: 1,
        p_page_size: 20,
      }),
    );
  });
});
