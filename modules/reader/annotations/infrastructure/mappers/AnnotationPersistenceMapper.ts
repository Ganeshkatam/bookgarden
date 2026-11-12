import type { Annotation, AnnotationColor } from "../../types/models";
import type { AnnotationAnchor } from "../../../../reader/application/ports/AnnotationAnchor";

export interface HighlightPersistenceRow {
  id: string;
  user_id: string;
  book_id: string;
  location_anchor: Record<string, unknown>;
  selected_text: string;
  color: string | null;
  created_at?: string;
}

export interface AnnotationPersistenceRow {
  id: string;
  user_id: string;
  book_id: string;
  highlight_id: string | null;
  location_anchor: Record<string, unknown>;
  body_markdown: string;
  created_at?: string;
  updated_at?: string;
}

export class AnnotationPersistenceMapper {
  /**
   * Serializes a domain Annotation of type 'highlight' into the database `public.highlights` schema.
   */
  static toHighlightPersistence(domain: Annotation): HighlightPersistenceRow {
    if (!domain.id || !domain.userId || !domain.bookId) {
      throw new Error("Highlight requires id, userId, and bookId");
    }
    if (!domain.anchor) {
      throw new Error("Highlight requires a location anchor");
    }

    return {
      id: domain.id,
      user_id: domain.userId,
      book_id: domain.bookId,
      location_anchor: domain.anchor as unknown as Record<string, unknown>,
      selected_text: domain.selectedText || "",
      color: domain.color || "yellow",
      created_at: domain.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Serializes a domain Annotation of type 'note' (standalone or attached) into the database `public.annotations` schema.
   */
  static toNotePersistence(domain: Annotation): AnnotationPersistenceRow {
    if (!domain.id || !domain.userId || !domain.bookId) {
      throw new Error("Annotation note requires id, userId, and bookId");
    }
    if (!domain.anchor) {
      throw new Error("Annotation note requires a location anchor");
    }

    return {
      id: domain.id,
      user_id: domain.userId,
      book_id: domain.bookId,
      highlight_id: domain.highlightId ?? null,
      location_anchor: domain.anchor as unknown as Record<string, unknown>,
      body_markdown: domain.noteText || "",
      created_at: domain.createdAt || new Date().toISOString(),
      updated_at: domain.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Deserializes a database `public.highlights` row into an in-memory domain Annotation.
   */
  static highlightToDomain(raw: HighlightPersistenceRow): Annotation {
    return {
      id: raw.id,
      userId: raw.user_id,
      bookId: raw.book_id,
      type: "highlight",
      anchor: raw.location_anchor as unknown as AnnotationAnchor,
      color: (raw.color as AnnotationColor) || "yellow",
      selectedText: raw.selected_text || "",
      createdAt: raw.created_at || new Date().toISOString(),
      updatedAt: raw.created_at || new Date().toISOString(),
      syncState: "synced",
    };
  }

  /**
   * Deserializes a database `public.annotations` row into an in-memory domain Annotation.
   */
  static noteToDomain(raw: AnnotationPersistenceRow): Annotation {
    return {
      id: raw.id,
      userId: raw.user_id,
      bookId: raw.book_id,
      type: "note",
      anchor: raw.location_anchor as unknown as AnnotationAnchor,
      noteText: raw.body_markdown || "",
      highlightId: raw.highlight_id ?? null,
      createdAt: raw.created_at || new Date().toISOString(),
      updatedAt: raw.updated_at || raw.created_at || new Date().toISOString(),
      syncState: "synced",
    };
  }
}
