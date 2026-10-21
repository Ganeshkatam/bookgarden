jest.mock("server-only", () => ({}), { virtual: true });

import { ReaderFacade } from "./application/facades/ReaderFacade";
import { IdentityProvider } from "@/shared/application/ports/identity/IdentityProvider";
import { BookRepository } from "@/modules/books/domain/repositories/BookRepository";
import { Book } from "@/modules/books/domain/entities/Book";
import { BookId } from "@/modules/books/domain/value-objects";
import { BookFile } from "@/modules/books/domain/value-objects/BookFile";
import { CanonicalBookProgressProjection } from "@/modules/library/application/projections/CanonicalBookProgressProjection";

describe("Reading Workspace End-to-End Integration", () => {
  const userId = "user-workspace-1";
  const bookId = "00000000-0000-0000-0000-000000000001";

  let mockIdentityProvider: jest.Mocked<IdentityProvider>;
  let mockBookRepository: jest.Mocked<BookRepository>;
  let mockSupabase: any;

  // In-memory persistent database simulator for the workspace session
  let dbReadingProgress: Record<string, any>;
  let dbReadingSessions: any[];
  let dbUserPreferences: Record<string, any>;
  let dbBookmarks: any[];
  let dbHighlights: any[];
  let dbAnnotations: any[];
  let dbLibraryBooks: any[];

  beforeEach(() => {
    dbReadingProgress = {};
    dbReadingSessions = [];
    dbUserPreferences = {
      [userId]: {
        reader_theme: "sepia",
        font_family: "Georgia",
        font_size: 18,
        line_height: 1.6,
      },
    };
    dbBookmarks = [];
    dbHighlights = [];
    dbAnnotations = [];
    dbLibraryBooks = [];

    mockIdentityProvider = {
      currentUserId: jest.fn().mockResolvedValue(userId),
      currentUser: jest.fn().mockResolvedValue({
        id: userId,
        email: "scholar@bookgarden.tomesphere.in",
        name: "Archival Scholar",
      }),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      hasRole: jest.fn().mockResolvedValue(false),
    };

    const bookEntity = Book.create({
      id: BookId.create(bookId),
      title: "The Republic",
      authors: ["Plato"],
      description: "Ancient philosophy on justice and the state.",
      coverUrl: "https://bookgarden.tomesphere.in/covers/republic.jpg",
      pageCount: 416,
      isTextbook: false,
      files: [
        BookFile.create({
          id: "file-1",
          format: "pdf",
          size: 1024000,
          storagePath: "book-pdfs/republic.pdf",
          mimeType: "application/pdf",
          checksum: null,
          version: 1,
          isPrimary: true,
        }),
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockBookRepository = {
      findById: jest.fn().mockResolvedValue(bookEntity),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    } as any;

    mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => ({
              maybeSingle: async () => {
                if (table === "reading_progress") {
                  const key = `${val1}_${val2}`;
                  return { data: dbReadingProgress[key] || null, error: null };
                }
                if (table === "user_preferences") {
                  return { data: dbUserPreferences[val1] || null, error: null };
                }
                return { data: null, error: null };
              },
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    if (table === "reading_sessions") {
                      const list = dbReadingSessions.filter(
                        (s) => s.user_id === val1 && s.book_id === val2,
                      );
                      return { data: list[list.length - 1] || null, error: null };
                    }
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
            maybeSingle: async () => {
              if (table === "user_preferences") {
                return { data: dbUserPreferences[val1] || null, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
    };
  });

  it("Step 1: User opens fresh book -> initializes with default/custom preferences and page 1", async () => {
    const facade = new ReaderFacade(mockIdentityProvider, mockBookRepository, mockSupabase);
    const readerPage = await facade.getReaderPage(bookId);

    expect(readerPage.book.title).toBe("The Republic");
    expect((readerPage.book as any).fileUrl).toBeUndefined();
    expect(readerPage.book.fileType).toBe("pdf");
    expect(readerPage.preferences.theme).toBe("sepia");
    expect(readerPage.preferences.fontFamily).toBe("Georgia");
    expect(readerPage.session.position).toBeNull();
    expect(readerPage.session.progress).toBe(0);
  });

  it("Step 2: User reads to page 84 -> progress persists and is reflected across Dashboard, Library, and Reader", async () => {
    // 1. Simulate reading progress write to database
    dbReadingProgress[`${userId}_${bookId}`] = {
      location_anchor: { type: "pdf", value: "84", percentage: 20 },
      last_read_at: new Date().toISOString(),
    };
    dbReadingSessions.push({
      id: "session-active-1",
      user_id: userId,
      book_id: bookId,
      current_page: 84,
      percentage: 20,
      reading_time_minutes: 45,
      started_at: new Date().toISOString(),
      last_read_at: new Date().toISOString(),
    });
    dbLibraryBooks.push({
      user_id: userId,
      book_id: bookId,
      status: "currently_reading",
    });

    // 2. Add bookmarks, highlights, and attached notes
    dbBookmarks.push({
      id: "bm-1",
      user_id: userId,
      book_id: bookId,
      page_number: 84,
      label: "The Allegory of the Cave",
    });
    dbHighlights.push({
      id: "hl-1",
      user_id: userId,
      book_id: bookId,
      selected_text: "The realm of knowledge is the good.",
      color: "#FDE047",
    });
    dbAnnotations.push({
      id: "note-1",
      user_id: userId,
      book_id: bookId,
      highlight_id: "hl-1",
      body_markdown: "Crucial metaphor on illumination and justice.",
    });

    // 3. Verify Canonical Projection from Book Page / Library perspective
    const projection = CanonicalBookProgressProjection.project({
      libraryStatus: "currently_reading",
      locationAnchor: { type: "pdf", value: "84", percentage: 20 },
      totalPages: 416,
      sessionCurrentPage: 84,
      sessionPercentage: 20,
    });

    expect(projection.status).toBe("currently_reading");
    expect(projection.currentPage).toBe(84);
    expect(projection.progressPercentage).toBe(20);
    expect(projection.inLibrary).toBe(true);

    // 4. User refreshes or reopens the reader from Dashboard -> Resumes at page 84 with preferences intact
    const facade = new ReaderFacade(mockIdentityProvider, mockBookRepository, mockSupabase);
    const refreshedPage = await facade.getReaderPage(bookId);

    expect(refreshedPage.session.position).toEqual({
      type: "pdf",
      value: "84",
      percentage: 20,
    });
    expect(refreshedPage.session.progress).toBe(20);
    expect(refreshedPage.preferences.theme).toBe("sepia");
  });

  it("Step 3: User finishes the book -> transitions monotonically to 100% and finished status", async () => {
    const finishedProjection = CanonicalBookProgressProjection.project({
      libraryStatus: "finished",
      totalPages: 416,
      sessionCurrentPage: 416,
      sessionPercentage: 100,
    });

    expect(finishedProjection.status).toBe("finished");
    expect(finishedProjection.progressPercentage).toBe(100);
    expect(finishedProjection.currentPage).toBe(416);
  });
});
