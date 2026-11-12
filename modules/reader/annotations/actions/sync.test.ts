import { fetchAnnotations, pushAnnotationChanges, SyncResponseData } from "./sync";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { getCurrentUser } from "@/modules/authentication/presentation/actions/auth";
import type { TextRangeAnchor } from "../../application/ports/AnnotationAnchor";

jest.mock("@/shared/core/database/server");
jest.mock("@/modules/authentication/presentation/actions/auth");

describe("Annotation Server Actions (sync.ts)", () => {
  const mockUserId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  const validBookId = "33333333-3333-4333-8333-333333333333";
  const validHighlightId = "44444444-4444-4444-8444-444444444444";
  const validNoteId = "55555555-5555-4555-8555-555555555555";

  const sampleAnchor: TextRangeAnchor = {
    type: "text",
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    rects: [],
    textQuote: "Sample",
  };

  let mockSupabase: any;
  let mockHighlightsFrom: any;
  let mockAnnotationsFrom: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (getCurrentUser as jest.Mock).mockResolvedValue({ id: mockUserId });

    mockHighlightsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    mockAnnotationsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === "highlights") return mockHighlightsFrom;
        if (table === "annotations") return mockAnnotationsFrom;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("fetchAnnotations", () => {
    it("should return unauthorized when user is not logged in", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      const res = await fetchAnnotations(validBookId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error?.message).toBe("Unauthorized");
      }
    });

    it("should fetch and deserialize from both highlights and annotations tables", async () => {
      mockHighlightsFrom.eq.mockImplementation((col: string) => {
        if (col === "user_id") {
          return Promise.resolve({
            data: [
              {
                id: validHighlightId,
                user_id: mockUserId,
                book_id: validBookId,
                location_anchor: sampleAnchor,
                selected_text: "Highlighted text",
                color: "yellow",
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            error: null,
          });
        }
        return mockHighlightsFrom;
      });

      mockAnnotationsFrom.eq.mockImplementation((col: string) => {
        if (col === "user_id") {
          return Promise.resolve({
            data: [
              {
                id: validNoteId,
                user_id: mockUserId,
                book_id: validBookId,
                highlight_id: validHighlightId,
                location_anchor: sampleAnchor,
                body_markdown: "Note commentary",
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            error: null,
          });
        }
        return mockAnnotationsFrom;
      });

      const res = await fetchAnnotations(validBookId);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.length).toBe(2);

        const highlight = res.data.find((d) => d.id === validHighlightId);
        expect(highlight?.type).toBe("highlight");
        expect(highlight?.selectedText).toBe("Highlighted text");

        const note = res.data.find((d) => d.id === validNoteId);
        expect(note?.type).toBe("note");
        expect(note?.noteText).toBe("Note commentary");
        expect(note?.highlightId).toBe(validHighlightId);
      }
    });
  });

  describe("pushAnnotationChanges", () => {
    it("should route highlights to highlights table and notes to annotations table", async () => {
      const payload = {
        creates: [
          {
            id: validHighlightId,
            bookId: validBookId,
            userId: mockUserId,
            type: "highlight" as const,
            anchor: sampleAnchor as unknown as Record<string, unknown>,
            color: "yellow" as const,
            selectedText: "Quote text",
          },
          {
            id: validNoteId,
            bookId: validBookId,
            userId: mockUserId,
            type: "note" as const,
            anchor: sampleAnchor as unknown as Record<string, unknown>,
            noteText: "Attached comment",
            highlightId: validHighlightId,
          },
        ],
        updates: [],
        deletes: [],
      };

      const res = await pushAnnotationChanges(payload);

      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("highlights");
      expect(mockSupabase.from).toHaveBeenCalledWith("annotations");

      expect(mockHighlightsFrom.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validHighlightId,
          user_id: mockUserId,
          selected_text: "Quote text",
          color: "yellow",
        }),
        { onConflict: "id" },
      );

      expect(mockAnnotationsFrom.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validNoteId,
          user_id: mockUserId,
          body_markdown: "Attached comment",
          highlight_id: validHighlightId,
        }),
        { onConflict: "id" },
      );

      if (res.success) {
        expect(res.data.acknowledgedIds).toEqual([validHighlightId, validNoteId]);
      }
    });

    it("should reject items where client userId does not match session user", async () => {
      const payload = {
        creates: [
          {
            id: validHighlightId,
            bookId: validBookId,
            userId: otherUserId, // Spoofed userId!
            type: "highlight" as const,
            anchor: sampleAnchor as unknown as Record<string, unknown>,
          },
        ],
        updates: [],
        deletes: [],
      };

      const res = await pushAnnotationChanges(payload);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.acknowledgedIds.length).toBe(0);
        expect(res.data.failedOperations[0].error).toContain("Unauthorized userId mismatch");
      }
      expect(mockHighlightsFrom.upsert).not.toHaveBeenCalled();
    });

    it("should correctly handle partial failures and report failed operation IDs", async () => {
      mockAnnotationsFrom.upsert.mockResolvedValueOnce({
        error: { message: "Foreign key violation on highlight_id" },
      });

      const payload = {
        creates: [
          {
            id: validHighlightId,
            bookId: validBookId,
            userId: mockUserId,
            type: "highlight" as const,
            anchor: sampleAnchor as unknown as Record<string, unknown>,
          },
          {
            id: validNoteId,
            bookId: validBookId,
            userId: mockUserId,
            type: "note" as const,
            anchor: sampleAnchor as unknown as Record<string, unknown>,
            highlightId: "99999999-9999-4999-8999-999999999999",
          },
        ],
        updates: [],
        deletes: [],
      };

      const res = await pushAnnotationChanges(payload);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.acknowledgedIds).toEqual([validHighlightId]);
        expect(res.data.failedOperations).toEqual([
          { id: validNoteId, error: "Foreign key violation on highlight_id" },
        ]);
      }
    });
  });
});
