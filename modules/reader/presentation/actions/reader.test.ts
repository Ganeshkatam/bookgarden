jest.mock("server-only", () => ({}), { virtual: true });

import {
  getHighlightsAction,
  getBookmarksAction,
  getNotesAction,
  createHighlightAction,
  deleteHighlightAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  createBookmarkAction,
  deleteBookmarkAction,
  startReadingSessionAction,
  updateReaderPositionAction,
  completeReadingSessionAction,
  completeBookAction,
} from "./reader";
import * as requireAuthModule from "@/modules/security/application/requireAuth";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/modules/security/application/requireAuth");
jest.mock("@/shared/core/database/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Reader Server Actions", () => {
  const mockUser = { id: "test-user-123", email: "reader@bookgarden.tomesphere.in" };
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthModule.requireAuth as jest.Mock).mockResolvedValue(mockUser);

    const createQueryBuilder = () => {
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "mock-id-1" }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      return builder;
    };

    mockSupabase = {
      from: jest.fn((table: string) => {
        const builder = createQueryBuilder();
        if (table === "bookmarks") {
          builder.match.mockImplementation((conditions: any) => ({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "bm-1",
                  user_id: mockUser.id,
                  book_id: conditions.book_id || "book-1",
                  page_number: 42,
                  label: "Chapter 3 start",
                  created_at: "2026-08-28T00:00:00Z",
                },
              ],
              error: null,
            }),
            ...Promise.resolve({ error: null }),
          }));
          builder.single.mockResolvedValue({
            data: { id: "bm-new-1", book_id: "book-1", page_number: 15, label: "Interesting Quote" },
            error: null,
          });
        } else if (table === "highlights") {
          builder.match.mockResolvedValue({
            data: [
              {
                id: "hl-1",
                user_id: mockUser.id,
                book_id: "book-1",
                color: "#ffeb3b",
                selected_text: "To be or not to be",
                location_anchor: { type: "pdf", value: "10" },
                created_at: "2026-08-28T00:00:00Z",
              },
            ],
            error: null,
          });
          builder.single.mockResolvedValue({
            data: {
              id: "hl-new-1",
              book_id: "book-1",
              selected_text: "Sample selected sentence",
              location_anchor: { type: "pdf", value: "5" },
              color: "#ffeb3b",
            },
            error: null,
          });
        } else if (table === "annotations") {
          builder.order.mockResolvedValue({
            data: [
              {
                id: "note-1",
                user_id: mockUser.id,
                book_id: "book-1",
                highlight_id: "hl-1",
                body_markdown: "Philosophical dilemma",
                created_at: "2026-08-28T00:00:00Z",
                updated_at: "2026-08-28T00:00:00Z",
              },
            ],
            error: null,
          });
          builder.single.mockResolvedValue({
            data: { id: "note-new-1" },
            error: null,
          });
        } else if (table === "reading_sessions") {
          builder.single.mockResolvedValue({
            data: { id: "session-1" },
            error: null,
          });
        }
        return builder;
      }),
    };

    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("Authentication Guard", () => {
    it("should return failure when user is unauthenticated", async () => {
      (requireAuthModule.requireAuth as jest.Mock).mockRejectedValue(
        new Error("Not authenticated"),
      );

      const result = await getBookmarksAction("book-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Not authenticated");
      }
    });
  });

  describe("Bookmarks Actions", () => {
    it("should fetch bookmarks successfully for authenticated user", async () => {
      const result = await getBookmarksAction("book-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("bm-1");
      }
    });

    it("should create bookmark successfully", async () => {
      const result = await createBookmarkAction({
        bookId: "book-1",
        anchor: { type: "page", value: "15" },
        label: "Interesting Quote",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("bm-new-1");
      }
    });

    it("should delete bookmark successfully", async () => {
      const result = await deleteBookmarkAction("bm-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Highlights Actions", () => {
    it("should fetch highlights successfully", async () => {
      const result = await getHighlightsAction("book-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].text).toBe("To be or not to be");
      }
    });

    it("should create highlight successfully", async () => {
      const result = await createHighlightAction({
        bookId: "book-1",
        selectedText: "Sample selected sentence",
        color: "#ffeb3b",
        selectionAnchor: { start: { type: "pdf", value: "5" }, end: { type: "pdf", value: "5" } },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("hl-new-1");
      }
    });

    it("should delete highlight successfully", async () => {
      const result = await deleteHighlightAction("hl-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Notes Actions", () => {
    it("should fetch notes successfully", async () => {
      const result = await getNotesAction("book-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].bodyMarkdown).toBe("Philosophical dilemma");
      }
    });

    it("should create note successfully", async () => {
      const result = await createNoteAction({
        bookId: "book-1",
        target: { type: "highlight", highlightId: "hl-1" },
        bodyMarkdown: "My notes on this section",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("note-new-1");
      }
    });

    it("should update note successfully", async () => {
      const result = await updateNoteAction({
        noteId: "note-1",
        bodyMarkdown: "Updated analysis text",
      });

      expect(result.success).toBe(true);
    });

    it("should delete note successfully", async () => {
      const result = await deleteNoteAction("note-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Position & Reading Session Lifecycle", () => {
    it("should start reading session and initialize library transition", async () => {
      const result = await startReadingSessionAction({
        bookId: "book-1",
        initialPage: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe("session-1");
      }
    });

    it("should update reader position idempotently", async () => {
      const result = await updateReaderPositionAction({
        bookId: "book-1",
        locationAnchor: { type: "page", value: "6" },
      });

      expect(result.success).toBe(true);
    });

    it("should complete reading session cleanly", async () => {
      const result = await completeReadingSessionAction({
        bookId: "book-1",
        sessionId: "session-1",
        durationSeconds: 1200,
        pagesRead: 15,
        currentPage: 25,
      });

      expect(result.success).toBe(true);
    });

    it("should complete book and transition library status to finished", async () => {
      const result = await completeBookAction({ bookId: "book-1" });
      expect(result.success).toBe(true);
    });
  });
});
