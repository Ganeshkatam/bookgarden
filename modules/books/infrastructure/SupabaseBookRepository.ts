import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/core/types/database";
import type {
  BookRepository,
  BookSearchQuery,
  TrendingQuery,
  PaginatedResult,
} from "../domain/repositories/BookRepository";
import type { BookId } from "../domain/value-objects";
import { Book } from "../domain/entities/Book";
import { BookMapper } from "./mappers/BookMapper";
import type { BookRow } from "./models/BookRow";
import { ConcurrencyConflictError } from "@/shared/kernel/DomainError";

export class SupabaseBookRepository implements BookRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: BookId): Promise<Book | null> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id.value,
      );
    let targetId = id.value;

    if (!isUuid) {
      const { data: doc } = await this.client
        .from("discovery_search_documents")
        .select("book_id")
        .eq("slug", id.value)
        .maybeSingle();

      if (!doc?.book_id) {
        return null;
      }
      targetId = doc.book_id;
    }

    const { data, error } = await this.client
      .from("books")
      .select(
        "*, book_authors(authors(name)), book_genres(genres(name)), book_subjects(subjects(name)), book_files(*)",
      )
      .eq("id", targetId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return BookMapper.toDomain(data as BookRow);
  }

  async search(query: BookSearchQuery): Promise<PaginatedResult<Book>> {
    let dbQuery = this.client
      .from("books")
      .select(
        "*, book_authors(authors(name)), book_genres(genres(name)), book_subjects(subjects(name)), book_files(*)",
        { count: "exact" },
      );

    if (query.term) {
      // Because full-text search requires exact matches or lexemes,
      // fallback to ilike if textSearch isn't heavily configured yet,
      // or use simple textSearch. For the old behavior:
      dbQuery = dbQuery.or(
        `title.ilike.%${query.term}%,author.ilike.%${query.term}%,description.ilike.%${query.term}%`,
      );
    }

    if (query.genre && query.genre.length > 0) {
      dbQuery = dbQuery.in("genre", query.genre);
    }

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }

    if (query.offset) {
      const limit = query.limit || 50;
      dbQuery = dbQuery.range(query.offset, query.offset + limit - 1);
    }

    const { data, error, count } = await dbQuery;

    if (error || !data) {
      return { items: [], totalCount: 0 };
    }

    return {
      items: (data as BookRow[]).map(BookMapper.toDomain),
      totalCount: count ?? undefined,
    };
  }

  async getTrending(query: TrendingQuery): Promise<Book[]> {
    // Read from precomputed windowed trending projection
    const { data: trendingRows } = await this.client
      .from("trending_books_projection")
      .select("book_id, daily_rank, all_time_rank")
      .order("daily_rank", { ascending: true })
      .limit(query.limit);

    if (trendingRows && trendingRows.length > 0) {
      const bookIds = trendingRows.map((t) => t.book_id);
      const { data: books } = await this.client
        .from("books")
        .select(
          "*, book_authors(authors(name)), book_genres(genres(name)), book_subjects(subjects(name)), book_files(*)",
        )
        .in("id", bookIds);

      if (books) {
        const bookMap = new Map((books as BookRow[]).map((b) => [b.id, b]));
        const sorted = bookIds
          .map((id) => bookMap.get(id))
          .filter((b): b is BookRow => Boolean(b));
        return sorted.map(BookMapper.toDomain);
      }
    }

    // Fallback if projection has not yet run
    const { data: fallbackBooks } = await this.client
      .from("books")
      .select(
        "*, book_authors(authors(name)), book_genres(genres(name)), book_subjects(subjects(name)), book_files(*)",
      )
      .limit(query.limit)
      .order("view_count", { ascending: false, nullsFirst: false });

    return ((fallbackBooks as BookRow[]) || []).map(BookMapper.toDomain);
  }

  async save(book: Book): Promise<void> {
    const events = book.pullDomainEvents().map((e) => ({
      aggregate_type: "book",
      aggregate_id: e.aggregateId,
      event_type: e.eventName,
      event_version: e.aggregateVersion,
      payload: JSON.parse(JSON.stringify(e)),
      occurred_at: e.occurredAt.toISOString(),
    }));

    const bookProps = book.toJSON();
    const serializedBook = {
      id: bookProps.id.value,
      title: bookProps.title,
      description: bookProps.description || null,
      is_textbook: bookProps.isTextbook,
      is_published: bookProps.isPublished,
      is_archived: bookProps.isArchived,
      version: book.version,
      created_at: bookProps.createdAt.toISOString(),
      updated_at: bookProps.updatedAt.toISOString(),
    };

    const { error } = await this.client.rpc("save_book_aggregate_with_events", {
      p_book: serializedBook as any,
      p_events: events.length > 0 ? events : null,
    });

    if (error) {
      console.error(
        "[SupabaseBookRepository] Failed to save book aggregate:",
        error,
      );

      // SQLSTATE 40001 (serialization_failure) or explicit Concurrency conflict message
      if (
        error.code === "40001" ||
        (typeof error.message === "string" &&
          error.message.includes("Concurrency conflict"))
      ) {
        throw new ConcurrencyConflictError(
          error.message || "The book was modified by another operation.",
        );
      }

      throw new Error(`Failed to save book: ${error.message}`);
    }
  }
}
