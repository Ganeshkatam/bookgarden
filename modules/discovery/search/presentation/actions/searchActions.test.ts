jest.mock("server-only", () => ({}), { virtual: true });

import {
  searchAction,
  autocompleteAction,
  getTrendingSearchesAction,
  getRecentSearchesAction,
  clearRecentSearchesAction,
} from "./searchActions";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/shared/core/database/server");

describe("Search Presentation Actions", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-searcher-1" } },
          error: null,
        }),
      },
      rpc: jest.fn().mockImplementation((fnName: string, args: any) => {
        if (fnName === "execute_book_search_v1") {
          return Promise.resolve({
            data: [
              {
                id: "book-1",
                title: "Dune",
                cover_url: "/cover.jpg",
                release_date: "1965-01-01",
                language: "English",
                authors: [{ id: "a1", name: "Frank Herbert", slug: "frank-herbert" }],
                genres: [{ id: "g1", name: "Sci-Fi" }],
                search_rank: 1,
              },
            ],
            error: null,
          });
        }
        if (fnName === "get_search_facets_v1") {
          return Promise.resolve({
            data: [{ facet_key: "genres", value: "Sci-Fi", count: 1 }],
            error: null,
          });
        }
        if (fnName === "get_search_autocomplete_v1") {
          return Promise.resolve({
            data: [
              {
                book_id: "book-1",
                title: "Dune",
                author: "Frank Herbert",
                slug: "dune",
                reason: "exact_prefix",
              },
            ],
            error: null,
          });
        }
        // get_recent_searches_v1 is retired — no mock needed; application returns [] directly.
        return Promise.resolve({ data: null, error: null });
      }),
      from: jest.fn().mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          if (table === "trending_books_projection") {
            return Promise.resolve({
              data: [{ book: { title: "Dune" } }, { book: { title: "The Hobbit" } }],
              error: null,
            });
          }
          return Promise.resolve({
            data: [],
            error: null,
          });
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    };

    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("should return search results via searchAction", async () => {
    const result = await searchAction({
      query: "Dune",
      page: 1,
      pageSize: 10,
      sort: "relevance",
      filters: {},
    });

    expect(result).toBeDefined();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("Dune");
  });

  it("should return autocomplete suggestions via autocompleteAction", async () => {
    const results = await autocompleteAction("Du");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Dune");
  });

  it("should return trending searches via getTrendingSearchesAction", async () => {
    const results = await getTrendingSearchesAction();

    expect(results).toBeDefined();
    expect(results).toContain("Dune");
  });

  it("should return empty array from getRecentSearchesAction (search history retired; handled client-side via localStorage)", async () => {
    const results = await getRecentSearchesAction();

    expect(results).toEqual([]);
  });

  it("should succeed via clearRecentSearchesAction", async () => {
    const result = await clearRecentSearchesAction();

    expect(result.success).toBe(true);
  });
});
