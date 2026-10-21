import { BookMapper } from "./BookMapper";
import { BookId } from "../../domain/value-objects";
import type { BookRow } from "../models/BookRow";

describe("BookMapper", () => {
  const sampleRow: BookRow = {
    id: "eb7a357d-795e-48d3-a126-cf9e7a47fce2",
    title: "The Monk Who Sold His Ferrari",
    description: "A fable about fulfilling your dreams.",
    cover_url: "https://example.com/cover.jpg",
    is_published: true,
    is_archived: false,
    version: 3,
    is_textbook: false,
    is_featured: true,
    edition: "First",
    isbn: "1234567890",
    language: "en",
    language_id: null,
    pages: 198,
    publisher: "HarperCollins",
    release_date: "1997-01-01",
    series: null,
    series_order: null,
    embedding: null,
    fts: null,
    download_count: 50,
    view_count: 120,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };

  it("maps is_published, is_archived, and version correctly into Book domain entity", () => {
    const book = BookMapper.toDomain(sampleRow);

    expect(book.bookId.value).toBe("eb7a357d-795e-48d3-a126-cf9e7a47fce2");
    expect(book.title).toBe("The Monk Who Sold His Ferrari");
    expect(book.isPublished).toBe(true);
    expect(book.isArchived).toBe(false);
    expect(book.version).toBe(3);
  });

  it("handles unpublished and archived books properly", () => {
    const unpublishedRow: BookRow = {
      ...sampleRow,
      is_published: false,
      is_archived: true,
    };

    const book = BookMapper.toDomain(unpublishedRow);

    expect(book.isPublished).toBe(false);
    expect(book.isArchived).toBe(true);
  });

  it("maps domain entity back to persistence row", () => {
    const book = BookMapper.toDomain(sampleRow);
    const persistence = BookMapper.toPersistence(book);

    expect(persistence.id).toBe(sampleRow.id);
    expect(persistence.title).toBe(sampleRow.title);
    expect(persistence.is_published).toBe(true);
    expect(persistence.is_archived).toBe(false);
    expect(persistence.version).toBe(3);
  });
});
