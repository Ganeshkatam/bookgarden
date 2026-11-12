import { addBookToLibrary } from "./handler";
import { LibraryRepository } from "../../../domain/repositories/LibraryRepository";
import { LibraryBook } from "../../../domain/entities/LibraryBook";
import { BookAddedToLibrary } from "../../../domain/events";
import { BusinessRuleViolation, ValidationError } from "@/shared/kernel/DomainError";

describe("AddBookToLibrary Command Handler", () => {
  let mockRepository: jest.Mocked<LibraryRepository>;

  const validUserId = "11111111-1111-4111-8111-111111111111";
  const validBookId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    mockRepository = {
      add: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      getLibraryEntry: jest.fn().mockResolvedValue(null),
      getCurrentlyReading: jest.fn().mockResolvedValue([]),
      getFinished: jest.fn().mockResolvedValue([]),
      getWantToRead: jest.fn().mockResolvedValue([]),
      getFavorites: jest.fn().mockResolvedValue([]),
    };
  });

  describe("Core State & Construction", () => {
    it("should add book with default state 'want_to_read' and correct IDs", async () => {
      const result = await addBookToLibrary(mockRepository, {
        userId: validUserId,
        bookId: validBookId,
      });

      expect(mockRepository.getLibraryEntry).toHaveBeenCalledWith(validUserId, validBookId);
      expect(mockRepository.add).toHaveBeenCalledTimes(1);

      const savedBook: LibraryBook = mockRepository.add.mock.calls[0][0];
      expect(savedBook).toBeInstanceOf(LibraryBook);
      expect(savedBook.userId.value).toBe(validUserId);
      expect(savedBook.bookId).toBe(validBookId);
      expect(savedBook.state.value).toBe("want_to_read");
      expect(savedBook.progress.value).toBe(0);
      expect(savedBook.timeline.startedAt).toBeNull();
      expect(savedBook.timeline.finishedAt).toBeNull();

      // Aggregate ID must be distinct from user and book IDs
      expect(savedBook.id).toBeDefined();
      expect(savedBook.id).not.toBe(validUserId);
      expect(savedBook.id).not.toBe(validBookId);
    });

    it("should add book with explicit initial state 'currently_reading' and active timeline", async () => {
      const result = await addBookToLibrary(mockRepository, {
        userId: validUserId,
        bookId: validBookId,
        initialState: "currently_reading",
      });

      expect(mockRepository.add).toHaveBeenCalledTimes(1);
      const savedBook: LibraryBook = mockRepository.add.mock.calls[0][0];
      expect(savedBook.state.value).toBe("currently_reading");
      expect(savedBook.progress.value).toBe(0);
      expect(savedBook.timeline.startedAt).toBeInstanceOf(Date);
      expect(savedBook.timeline.finishedAt).toBeNull();

      expect(result.output.state).toBe("currently_reading");
      expect(result.output.startedAt).toBeDefined();
    });

    it("should add book with explicit initial state 'finished' with 100% progress and completed timeline", async () => {
      const result = await addBookToLibrary(mockRepository, {
        userId: validUserId,
        bookId: validBookId,
        initialState: "finished",
      });

      expect(mockRepository.add).toHaveBeenCalledTimes(1);
      const savedBook: LibraryBook = mockRepository.add.mock.calls[0][0];
      expect(savedBook.state.value).toBe("finished");
      expect(savedBook.progress.value).toBe(100);
      expect(savedBook.timeline.startedAt).toBeInstanceOf(Date);
      expect(savedBook.timeline.finishedAt).toBeInstanceOf(Date);

      expect(result.output.state).toBe("finished");
      expect(result.output.progress).toBe(100);
      expect(result.output.finishedAt).toBeDefined();
    });
  });

  describe("Output and Domain Event Integrity", () => {
    it("should return output DTO with IDs matching input IDs exactly", async () => {
      const result = await addBookToLibrary(mockRepository, {
        userId: validUserId,
        bookId: validBookId,
      });

      expect(result.output).toBeDefined();
      expect(result.output.userId).toBe(validUserId);
      expect(result.output.bookId).toBe(validBookId);
      expect(result.output.state).toBe("want_to_read");
      expect(result.output.progress).toBe(0);
      expect(result.output.isFavorite).toBe(false);
    });

    it("should emit exactly one BookAddedToLibrary event with correct user and book IDs", async () => {
      const result = await addBookToLibrary(mockRepository, {
        userId: validUserId,
        bookId: validBookId,
        initialState: "currently_reading",
      });

      expect(result.events).toHaveLength(1);
      const event = result.events[0];
      expect(event).toBeInstanceOf(BookAddedToLibrary);

      const addedEvent = event as BookAddedToLibrary;
      expect(addedEvent.eventName).toBe("BookAddedToLibrary");
      expect(addedEvent.userId).toBe(validUserId);
      expect(addedEvent.bookId).toBe(validBookId);
      expect(addedEvent.state).toBe("currently_reading");
      expect(addedEvent.aggregateId).toBeDefined();
      expect(addedEvent.aggregateId).not.toBe(validUserId);
      expect(addedEvent.aggregateId).not.toBe(validBookId);
      expect(addedEvent.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe("Business Rules & Failure Modes", () => {
    it("should throw BusinessRuleViolation when book is already in the library and not call add()", async () => {
      const existingEntry = LibraryBook.fromPersistence(
        "existing-entry-id",
        validUserId,
        validBookId,
        "want_to_read",
        0,
        null,
        null,
        new Date(),
      );
      mockRepository.getLibraryEntry.mockResolvedValueOnce(existingEntry);

      await expect(
        addBookToLibrary(mockRepository, {
          userId: validUserId,
          bookId: validBookId,
        }),
      ).rejects.toThrow(BusinessRuleViolation);

      expect(mockRepository.getLibraryEntry).toHaveBeenCalledWith(validUserId, validBookId);
      expect(mockRepository.add).not.toHaveBeenCalled();
    });

    it("should propagate repository add() failure and produce no false success", async () => {
      mockRepository.add.mockRejectedValueOnce(new Error("Database connection dropped during insert"));

      await expect(
        addBookToLibrary(mockRepository, {
          userId: validUserId,
          bookId: validBookId,
        }),
      ).rejects.toThrow("Database connection dropped during insert");
    });

    it("should propagate repository lookup failure and not treat it as an absent entry", async () => {
      mockRepository.getLibraryEntry.mockRejectedValueOnce(new Error("Database lookup timeout"));

      await expect(
        addBookToLibrary(mockRepository, {
          userId: validUserId,
          bookId: validBookId,
        }),
      ).rejects.toThrow("Database lookup timeout");

      expect(mockRepository.add).not.toHaveBeenCalled();
    });
  });

  describe("Boundary Validation", () => {
    it("should fail domain validation when userId is empty", async () => {
      await expect(
        addBookToLibrary(mockRepository, {
          userId: "",
          bookId: validBookId,
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.add).not.toHaveBeenCalled();
    });

    it("should fail domain validation when userId is whitespace", async () => {
      await expect(
        addBookToLibrary(mockRepository, {
          userId: "   ",
          bookId: validBookId,
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.add).not.toHaveBeenCalled();
    });

    it("should fail validation when bookId is empty", async () => {
      await expect(
        addBookToLibrary(mockRepository, {
          userId: validUserId,
          bookId: "",
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.add).not.toHaveBeenCalled();
    });

    it("should fail validation when bookId is whitespace", async () => {
      await expect(
        addBookToLibrary(mockRepository, {
          userId: validUserId,
          bookId: "   ",
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.add).not.toHaveBeenCalled();
    });
  });
});

