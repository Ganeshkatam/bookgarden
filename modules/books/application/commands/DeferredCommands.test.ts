import { ArchiveBookHandler } from "./ArchiveBookCommand";
import { RestoreBookHandler } from "./RestoreBookCommand";
import { ReplaceBookFilesHandler } from "./ReplaceBookFilesCommand";
import { ChangeBookLanguageHandler } from "./ChangeBookLanguageCommand";
import { Book } from "../../domain/entities/Book";
import { BookId } from "../../domain/value-objects";
import { BookRepository } from "../../domain/repositories/BookRepository";
import { BookFileRepository } from "../../domain/repositories/BookFileRepository";
import { BookFile } from "../../domain/value-objects/BookFile";

describe("Book Lifecycle Management Commands", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("Deferred fallback behavior (when repository not injected)", () => {
    it("ArchiveBookHandler should not throw and should warn", async () => {
      const handler = new ArchiveBookHandler();
      await expect(handler.execute({ id: "book-123" })).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[Deferred]"));
    });

    it("RestoreBookHandler should not throw and should warn", async () => {
      const handler = new RestoreBookHandler();
      await expect(handler.execute({ id: "book-123" })).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[Deferred]"));
    });

    it("ReplaceBookFilesHandler should not throw and should warn", async () => {
      const handler = new ReplaceBookFilesHandler();
      await expect(handler.execute({ id: "book-123", files: [] })).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[Deferred]"));
    });

    it("ChangeBookLanguageHandler should not throw and should warn", async () => {
      const handler = new ChangeBookLanguageHandler();
      await expect(handler.execute({ id: "book-123", language: "fr" })).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[Deferred]"));
    });
  });

  describe("Implemented domain execution (when repository is injected)", () => {
    let mockBook: Book;
    let mockBookRepo: jest.Mocked<BookRepository>;
    let mockFileRepo: jest.Mocked<BookFileRepository>;

    beforeEach(() => {
      mockBook = Book.create({
        id: BookId.create("11111111-1111-4111-8111-111111111111"),
        title: "The Odyssey",
        authors: ["Homer"],
        isTextbook: false,
        isPublished: true,
        isArchived: false,
        files: [
          BookFile.create({
            id: "file-1",
            format: "pdf",
            storagePath: "/path/to/odyssey.pdf",
            mimeType: "application/pdf",
            checksum: "abc",
            size: 1024,
            version: 1,
            isPrimary: true,
          }),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockBookRepo = {
        findById: jest.fn().mockResolvedValue(mockBook),
        search: jest.fn(),
        getTrending: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockFileRepo = {
        save: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };
    });

    it("ArchiveBookHandler should archive the book, unpublish it, and save", async () => {
      const handler = new ArchiveBookHandler(mockBookRepo);
      await handler.execute({ id: "11111111-1111-4111-8111-111111111111" });

      expect(mockBookRepo.findById).toHaveBeenCalled();
      expect(mockBook.isArchived).toBe(true);
      expect(mockBook.isPublished).toBe(false);
      expect(mockBookRepo.save).toHaveBeenCalledWith(mockBook);
    });

    it("RestoreBookHandler should restore an archived book and save", async () => {
      mockBook.archive();
      expect(mockBook.isArchived).toBe(true);

      const handler = new RestoreBookHandler(mockBookRepo);
      await handler.execute({ id: "11111111-1111-4111-8111-111111111111" });

      expect(mockBook.isArchived).toBe(false);
      expect(mockBookRepo.save).toHaveBeenCalledWith(mockBook);
    });

    it("ChangeBookLanguageHandler should update language and save", async () => {
      const handler = new ChangeBookLanguageHandler(mockBookRepo);
      await handler.execute({ id: "11111111-1111-4111-8111-111111111111", language: "el" });

      expect(mockBook.language).toBe("el");
      expect(mockBookRepo.save).toHaveBeenCalledWith(mockBook);
    });

    it("ReplaceBookFilesHandler should delete old files and register new ones", async () => {
      const handler = new ReplaceBookFilesHandler(mockBookRepo, mockFileRepo);
      await handler.execute({
        id: "11111111-1111-4111-8111-111111111111",
        files: [
          {
            format: "epub",
            storagePath: "/path/to/odyssey.epub",
            mimeType: "application/epub+zip",
            size: 2048,
            isPrimary: true,
          },
        ],
      });

      expect(mockFileRepo.delete).toHaveBeenCalledWith("file-1");
      expect(mockFileRepo.save).toHaveBeenCalled();
      expect(mockBook.files).toHaveLength(1);
      expect(mockBook.files[0].format).toBe("epub");
      expect(mockBookRepo.save).toHaveBeenCalledWith(mockBook);
    });

    it("should throw an error if book is not found", async () => {
      mockBookRepo.findById.mockResolvedValueOnce(null);
      const handler = new ArchiveBookHandler(mockBookRepo);
      await expect(
        handler.execute({ id: "99999999-9999-4999-8999-999999999999" }),
      ).rejects.toThrow("Book with id 99999999-9999-4999-8999-999999999999 not found");
    });
  });
});
