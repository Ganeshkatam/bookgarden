import { AnnotationPersistenceMapper } from "./AnnotationPersistenceMapper";
import type { Annotation } from "../../types/models";
import type { TextRangeAnchor, AreaAnchor } from "../../../application/ports/AnnotationAnchor";

describe("AnnotationPersistenceMapper", () => {
  const sampleHighlightAnchor: TextRangeAnchor = {
    type: "text",
    pageNumber: 1,
    startOffset: 10,
    endOffset: 50,
    rects: [{ x: 10, y: 20, width: 80, height: 15 }],
    textQuote: "This is a highlighted quote from the book.",
  };

  const sampleAreaAnchor: AreaAnchor = {
    type: "area",
    pageNumber: 12,
    rect: { x: 10, y: 20, width: 100, height: 200 },
  };

  const sampleHighlightAnnotation: Annotation = {
    id: "11111111-1111-4111-8111-111111111111",
    bookId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    type: "highlight",
    anchor: sampleHighlightAnchor,
    color: "pink",
    selectedText: "This is a highlighted quote from the book.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    syncState: "synced",
  };

  const sampleStandaloneNote: Annotation = {
    id: "44444444-4444-4444-8444-444444444444",
    bookId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    type: "note",
    anchor: sampleAreaAnchor,
    noteText: "This is a standalone commentary on page 12.",
    highlightId: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    syncState: "synced",
  };

  const sampleAttachedNote: Annotation = {
    id: "55555555-5555-4555-8555-555555555555",
    bookId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    type: "note",
    anchor: sampleHighlightAnchor,
    noteText: "Annotation attached to highlight 11111111-...",
    highlightId: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    syncState: "synced",
  };

  describe("Highlight Serialization & Deserialization", () => {
    it("should serialize a highlight into public.highlights schema with exact column names", () => {
      const row = AnnotationPersistenceMapper.toHighlightPersistence(sampleHighlightAnnotation);

      expect(row.id).toBe(sampleHighlightAnnotation.id);
      expect(row.user_id).toBe(sampleHighlightAnnotation.userId);
      expect(row.book_id).toBe(sampleHighlightAnnotation.bookId);
      expect(row.location_anchor).toEqual(sampleHighlightAnnotation.anchor);
      expect(row.selected_text).toBe("This is a highlighted quote from the book.");
      expect(row.color).toBe("pink");

      expect((row as any).type).toBeUndefined();
      expect((row as any).note_text).toBeUndefined();
      expect((row as any).body_markdown).toBeUndefined();
      expect((row as any).anchor).toBeUndefined();
    });

    it("should deserialize a public.highlights row into a domain Annotation", () => {
      const rawRow = {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "33333333-3333-4333-8333-333333333333",
        book_id: "22222222-2222-4222-8222-222222222222",
        location_anchor: sampleHighlightAnchor as unknown as Record<string, unknown>,
        selected_text: "This is a highlighted quote from the book.",
        color: "pink",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      const domain = AnnotationPersistenceMapper.highlightToDomain(rawRow);

      expect(domain.id).toBe(rawRow.id);
      expect(domain.userId).toBe(rawRow.user_id);
      expect(domain.bookId).toBe(rawRow.book_id);
      expect(domain.type).toBe("highlight");
      expect(domain.anchor).toEqual(rawRow.location_anchor);
      expect(domain.color).toBe("pink");
      expect(domain.selectedText).toBe("This is a highlighted quote from the book.");
      expect(domain.syncState).toBe("synced");
    });
  });

  describe("Annotation Note Serialization & Deserialization", () => {
    it("should serialize a standalone note with highlight_id: null and body_markdown", () => {
      const row = AnnotationPersistenceMapper.toNotePersistence(sampleStandaloneNote);

      expect(row.id).toBe(sampleStandaloneNote.id);
      expect(row.user_id).toBe(sampleStandaloneNote.userId);
      expect(row.book_id).toBe(sampleStandaloneNote.bookId);
      expect(row.highlight_id).toBeNull();
      expect(row.location_anchor).toEqual(sampleStandaloneNote.anchor);
      expect(row.body_markdown).toBe("This is a standalone commentary on page 12.");

      expect((row as any).type).toBeUndefined();
      expect((row as any).color).toBeUndefined();
      expect((row as any).note_text).toBeUndefined();
      expect((row as any).anchor).toBeUndefined();
    });

    it("should serialize an attached note preserving the foreign highlight_id", () => {
      const row = AnnotationPersistenceMapper.toNotePersistence(sampleAttachedNote);

      expect(row.highlight_id).toBe("11111111-1111-4111-8111-111111111111");
      expect(row.body_markdown).toBe("Annotation attached to highlight 11111111-...");
    });

    it("should deserialize a public.annotations row into a domain Annotation", () => {
      const rawRow = {
        id: "55555555-5555-4555-8555-555555555555",
        user_id: "33333333-3333-4333-8333-333333333333",
        book_id: "22222222-2222-4222-8222-222222222222",
        highlight_id: "11111111-1111-4111-8111-111111111111",
        location_anchor: sampleHighlightAnchor as unknown as Record<string, unknown>,
        body_markdown: "Annotation attached to highlight 11111111-...",
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-03T00:00:00.000Z",
      };

      const domain = AnnotationPersistenceMapper.noteToDomain(rawRow);

      expect(domain.id).toBe(rawRow.id);
      expect(domain.userId).toBe(rawRow.user_id);
      expect(domain.bookId).toBe(rawRow.book_id);
      expect(domain.type).toBe("note");
      expect(domain.highlightId).toBe("11111111-1111-4111-8111-111111111111");
      expect(domain.noteText).toBe("Annotation attached to highlight 11111111-...");
      expect(domain.syncState).toBe("synced");
    });
  });

  describe("Validation Guards", () => {
    it("should throw when serializing highlight missing required IDs", () => {
      expect(() =>
        AnnotationPersistenceMapper.toHighlightPersistence({
          ...sampleHighlightAnnotation,
          id: "",
        }),
      ).toThrow("Highlight requires id, userId, and bookId");
    });

    it("should throw when serializing note missing location anchor", () => {
      expect(() =>
        AnnotationPersistenceMapper.toNotePersistence({
          ...sampleStandaloneNote,
          anchor: null as any,
        }),
      ).toThrow("Annotation note requires a location anchor");
    });
  });
});
