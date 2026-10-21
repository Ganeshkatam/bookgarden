jest.mock("server-only", () => ({}), { virtual: true });

import { ReaderAccessService, ReaderAccessError } from "./ReaderAccessService";
import { IdentityProvider } from "@/shared/application/ports/identity/IdentityProvider";
import { BookRepository } from "@/modules/books/domain/repositories/BookRepository";
import { Book } from "@/modules/books/domain/entities/Book";
import { BookId } from "@/modules/books/domain/value-objects";
import { BookFile } from "@/modules/books/domain/value-objects/BookFile";
import { assertCanonicalBookObjectKey } from "../policy/CanonicalStorageKey";

describe("ReaderAccessService & Adversarial Canonical Storage Boundary", () => {
  const userId = "usr-ad-001";
  const bookId = "00000000-0000-0000-0000-000000000001";
  const otherBookId = "99999999-9999-9999-9999-999999999999";

  let mockIdentityProvider: jest.Mocked<IdentityProvider>;
  let mockBookRepository: jest.Mocked<BookRepository>;
  let mockAdminStorage: any;

  beforeEach(() => {
    mockIdentityProvider = {
      currentUser: jest.fn().mockResolvedValue({ id: userId, email: "user@tomesphere.in" }),
      currentUserId: jest.fn().mockResolvedValue(userId),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      hasRole: jest.fn().mockResolvedValue(false),
    };

    mockBookRepository = {
      findById: jest.fn(),
      search: jest.fn(),
      getTrending: jest.fn(),
      save: jest.fn(),
    };

    mockAdminStorage = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: `https://qusuvzwycdmnecixzsgc.supabase.co/storage/v1/object/sign/book-pdfs/${bookId}/odyssey.epub?token=valid-token-60s` },
            error: null,
          }),
        }),
      },
    };
  });

  const createTestBook = (opts: {
    isPublished?: boolean;
    isArchived?: boolean;
    files: BookFile[];
    id?: string;
  }) => {
    return Book.create({
      id: BookId.create(opts.id || bookId),
      title: "Test Work",
      authors: ["Author"],
      isTextbook: false,
      isPublished: opts.isPublished ?? true,
      isArchived: opts.isArchived ?? false,
      files: opts.files,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  it("1. Unauthenticated request -> strictly denied with 401 UNAUTHENTICATED", async () => {
    mockIdentityProvider.currentUser.mockResolvedValue(null);
    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);

    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("2. Non-existent book -> returns 404 BOOK_NOT_FOUND", async () => {
    mockBookRepository.findById.mockResolvedValue(null);
    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);

    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 404,
      code: "BOOK_NOT_FOUND",
    });
  });

  it("3. Unpublished book -> strictly denied with 403 BOOK_UNPUBLISHED", async () => {
    const unpublishedBook = createTestBook({
      isPublished: false,
      files: [
        BookFile.create({
          id: "f1",
          format: "pdf",
          storagePath: `${bookId}/draft.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: true,
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(unpublishedBook);

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 403,
      code: "BOOK_UNPUBLISHED",
    });
  });

  it("4. Archived book -> strictly denied with 403 BOOK_ARCHIVED", async () => {
    const archivedBook = createTestBook({
      isPublished: true,
      isArchived: true,
      files: [
        BookFile.create({
          id: "f1",
          format: "pdf",
          storagePath: `${bookId}/archived.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: true,
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(archivedBook);

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 403,
      code: "BOOK_ARCHIVED",
    });
  });

  it("5. Published book with valid canonical storage path -> issues 60-second signed URL DTO", async () => {
    const canonicalKey = `${bookId}/odyssey.epub`;
    const validBook = createTestBook({
      files: [
        BookFile.create({
          id: "f1",
          format: "epub",
          storagePath: canonicalKey,
          mimeType: "application/epub+zip",
          checksum: null,
          size: 2048,
          version: 1,
          isPrimary: true,
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(validBook);

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    const accessDto = await service.getSignedReaderAccess(bookId);

    expect(accessDto.bookId).toBe(bookId);
    expect(accessDto.signedUrl).toContain("valid-token-60s");
    expect(accessDto.fileType).toBe("epub");
    expect(new Date(accessDto.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Invariant: DTO must never leak internal storage path or bucket metadata
    expect((accessDto as any).storagePath).toBeUndefined();
    expect((accessDto as any).bucket).toBeUndefined();
    expect((accessDto as any).internalKey).toBeUndefined();

    // Verify Supabase storage signing was invoked with exact canonical key
    expect(mockAdminStorage.storage.from).toHaveBeenCalledWith("book-pdfs");
    expect(mockAdminStorage.storage.from("book-pdfs").createSignedUrl).toHaveBeenCalledWith(
      canonicalKey,
      60,
    );
  });

  it("6. Missing primary file -> fails closed with 404 PRIMARY_CONTENT_FILE_UNAVAILABLE", async () => {
    const bookWithoutPrimary = createTestBook({
      files: [
        BookFile.create({
          id: "f1",
          format: "pdf",
          storagePath: `${bookId}/chapter1.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: false, // NOT primary
        }),
        BookFile.create({
          id: "f2",
          format: "pdf",
          storagePath: `${bookId}/chapter2.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: false, // NOT primary
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(bookWithoutPrimary);

    // Verify domain entity itself returns null for getPrimaryFile
    expect(bookWithoutPrimary.getPrimaryFile()).toBeNull();

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 404,
      code: "PRIMARY_CONTENT_FILE_UNAVAILABLE",
    });
  });

  it("7. Multiple files where exactly one is primary -> returns the designated primary file only", async () => {
    const bookWithDesignatedPrimary = createTestBook({
      files: [
        BookFile.create({
          id: "f1",
          format: "pdf",
          storagePath: `${bookId}/supplemental.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: false,
        }),
        BookFile.create({
          id: "f2",
          format: "pdf",
          storagePath: `${bookId}/complete_book.pdf`,
          mimeType: "application/pdf",
          checksum: null,
          size: 4096,
          version: 1,
          isPrimary: true, // Designated primary
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(bookWithDesignatedPrimary);

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    await service.getSignedReaderAccess(bookId);

    expect(mockAdminStorage.storage.from("book-pdfs").createSignedUrl).toHaveBeenCalledWith(
      `${bookId}/complete_book.pdf`,
      60,
    );
  });

  it("8. Wrong-book storage path -> strictly rejected with 500 STORAGE_PATH_BOOK_MISMATCH", async () => {
    const bookWithForeignPath = createTestBook({
      files: [
        BookFile.create({
          id: "f1",
          format: "pdf",
          storagePath: `${otherBookId}/stolen_content.pdf`, // Path belongs to otherBookId
          mimeType: "application/pdf",
          checksum: null,
          size: 1024,
          version: 1,
          isPrimary: true,
        }),
      ],
    });
    mockBookRepository.findById.mockResolvedValue(bookWithForeignPath);

    const service = new ReaderAccessService(mockIdentityProvider, mockBookRepository, mockAdminStorage);
    await expect(service.getSignedReaderAccess(bookId)).rejects.toMatchObject({
      statusCode: 500,
      code: "STORAGE_PATH_BOOK_MISMATCH",
    });
  });

  describe("assertCanonicalBookObjectKey positive grammar and traversal protections", () => {
    it("rejects ../ directory traversal", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/../other-book/file.pdf`, bookId),
      ).toThrow(ReaderAccessError);

      expect(() =>
        assertCanonicalBookObjectKey(`../${bookId}/file.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects backslash directory traversal", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}\\subdir\\file.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects raw URL storage paths without URL parsing bypass", () => {
      expect(() =>
        assertCanonicalBookObjectKey(
          `https://qusuvzwycdmnecixzsgc.supabase.co/storage/v1/object/public/book-pdfs/${bookId}/file.pdf`,
          bookId,
        ),
      ).toThrow(ReaderAccessError);

      expect(() =>
        assertCanonicalBookObjectKey(
          `http://example.com/books/${bookId}/file.pdf`,
          bookId,
        ),
      ).toThrow(ReaderAccessError);
    });

    it("rejects bucket-prefixed storage paths", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`book-pdfs/${bookId}/file.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects absolute paths with leading slash", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`/${bookId}/file.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects percent-encoded path separators", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}%2ffile.pdf`, bookId),
      ).toThrow(ReaderAccessError);

      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}%2Ffile.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects query parameters and fragment identifiers", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/file.pdf?download=true`, bookId),
      ).toThrow(ReaderAccessError);

      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/file.pdf#section1`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects path with book ID mismatch", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${otherBookId}/file.pdf`, bookId),
      ).toThrow(expect.objectContaining({ code: "STORAGE_PATH_BOOK_MISMATCH" }));
    });

    it("accepts valid canonical storage path", () => {
      expect(
        assertCanonicalBookObjectKey(`${bookId}/valid_manuscript.pdf`, bookId),
      ).toBe(`${bookId}/valid_manuscript.pdf`);

      expect(
        assertCanonicalBookObjectKey(`${bookId}/The Great Gatsby (1925).epub`, bookId),
      ).toBe(`${bookId}/The Great Gatsby (1925).epub`);
    });
  });
});
