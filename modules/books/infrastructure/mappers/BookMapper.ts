import { Book } from "../../domain/entities/Book";
import { BookId } from "../../domain/value-objects";
import { BookFileMapper } from "./BookFileMapper";
import type { BookRow } from "../models/BookRow";

export class BookMapper {
  static toDomain(raw: BookRow): Book {
    return Book.create({
      id: BookId.create(raw.id),
      title: raw.title,
      authors:
        (raw as any).book_authors
          ?.map((ba: any) => ba.authors?.name)
          .filter(Boolean) || [],
      coverUrl: raw.cover_url,
      description: raw.description,
      genres:
        (raw as any).book_genres
          ?.map((bg: any) => bg.genres?.name)
          .filter(Boolean) || [],
      publishedDate: raw.release_date,
      pageCount: raw.pages,
      isTextbook: raw.is_textbook || false,
      isPublished: raw.is_published ?? false,
      isArchived: raw.is_archived ?? false,
      version: raw.version ?? 1,
      subjects:
        (raw as any).book_subjects
          ?.map((bs: any) => bs.subjects?.name)
          .filter(Boolean) || [],
      files: ((raw as any).book_files || []).map(BookFileMapper.toDomain),
      createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
      updatedAt:
        raw.updated_at || raw.created_at
          ? new Date((raw.updated_at || raw.created_at)!)
          : new Date(),
    });
  }

  static toPersistence(domain: Book): Partial<BookRow> {
    return {
      id: domain.bookId.value,
      title: domain.title,
      // We don't map arrays back to BookRow here, persistence of many-to-many
      // is handled in the Repository itself by inserting into junction tables.
      cover_url: domain.coverUrl ?? undefined,
      description: domain.description ?? undefined,
      is_textbook: domain.isTextbook,
      is_published: domain.isPublished,
      is_archived: domain.isArchived,
      version: domain.version,
      release_date: domain.publishedDate ?? undefined,
      pages: domain.pageCount ?? undefined,
    };
  }
}
