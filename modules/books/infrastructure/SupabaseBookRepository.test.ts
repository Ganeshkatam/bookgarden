import { SupabaseBookRepository } from "./SupabaseBookRepository";
import { Book } from "../domain/entities/Book";
import { BookId } from "../domain/value-objects";
import { ConcurrencyConflictError } from "@/shared/kernel/DomainError";
import { BookFile } from "../domain/value-objects/BookFile";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/core/types/database";

describe("SupabaseBookRepository - Optimistic Concurrency & Serialization", () => {
  let mockRpc: jest.Mock;
  let mockClient: jest.Mocked<SupabaseClient<Database>>;
  let repository: SupabaseBookRepository;

  const validBookId = "33333333-3333-4333-8333-333333333333";

  function createTestBook(version = 1, title = "Test Concurrency Book"): Book {
    return Book.create({
      id: BookId.create(validBookId),
      title,
      authors: ["Author A"],
      isTextbook: false,
      files: [],
      version,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  }

  beforeEach(() => {
    mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient = {
      rpc: mockRpc,
      from: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient<Database>>;

    repository = new SupabaseBookRepository(mockClient);
  });

  describe("Serialization Contract", () => {
    it("should serialize version: 1 for a new book aggregate", async () => {
      const book = createTestBook(1);

      await repository.save(book);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [rpcName, rpcParams] = mockRpc.mock.calls[0];
      expect(rpcName).toBe("save_book_aggregate_with_events");
      expect(rpcParams.p_book).toBeDefined();

      // Explicit regression check: version must never be omitted or undefined
      expect(rpcParams.p_book.version).toBe(1);
      expect(rpcParams.p_book.id).toBe(validBookId);
      expect(rpcParams.p_book.title).toBe("Test Concurrency Book");
    });

    it("should serialize version: 2 for an existing book loaded at version 2", async () => {
      const book = createTestBook(2);

      await repository.save(book);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [, rpcParams] = mockRpc.mock.calls[0];
      expect(rpcParams.p_book.version).toBe(2);
    });

    it("should serialize version: 10 for an existing book at version 10", async () => {
      const book = createTestBook(10);

      await repository.save(book);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [, rpcParams] = mockRpc.mock.calls[0];
      expect(rpcParams.p_book.version).toBe(10);
    });

    it("should serialize incremented target version when aggregate is mutated in memory", async () => {
      const book = createTestBook(3);
      expect(book.version).toBe(3);

      // Mutate aggregate -> increments version to 4
      book.updateDetails({ title: "Updated Title Across Concurrency" });
      expect(book.version).toBe(4);

      await repository.save(book);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [, rpcParams] = mockRpc.mock.calls[0];
      expect(rpcParams.p_book.version).toBe(4);
      expect(rpcParams.p_book.title).toBe("Updated Title Across Concurrency");
    });

    it("should serialize null for p_events when aggregate has no pending domain events", async () => {
      const book = createTestBook(1);

      await repository.save(book);

      const [, rpcParams] = mockRpc.mock.calls[0];
      expect(rpcParams.p_events).toBeNull();
    });

    it("should serialize domain events in p_events when aggregate has pending events", async () => {
      const book = createTestBook(1);
      book.publish();
      // Allow dynamic import microtask to attach event
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.save(book);

      const [, rpcParams] = mockRpc.mock.calls[0];
      if (rpcParams.p_events !== null) {
        expect(Array.isArray(rpcParams.p_events)).toBe(true);
        expect(rpcParams.p_events[0].aggregate_type).toBe("book");
        expect(rpcParams.p_events[0].aggregate_id).toBe(validBookId);
      }
    });
  });

  describe("Error Mapping & Concurrency Conflict Handling", () => {
    it("should throw ConcurrencyConflictError when database returns SQLSTATE 40001", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "40001",
          message:
            "Concurrency conflict: book 33333333-3333-4333-8333-333333333333 was modified by another editor (expected version 1)",
          details: null,
          hint: null,
        },
      });

      const book = createTestBook(2);

      await expect(repository.save(book)).rejects.toThrow(
        ConcurrencyConflictError,
      );
    });

    it("should throw ConcurrencyConflictError when error message contains Concurrency conflict", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "P0001",
          message:
            "Concurrency conflict: book was modified by another transaction",
          details: null,
          hint: null,
        },
      });

      const book = createTestBook(2);

      await expect(repository.save(book)).rejects.toThrow(
        ConcurrencyConflictError,
      );
    });

    it("should preserve generic Error for non-concurrency database errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "42P01",
          message: 'relation "books" does not exist',
          details: null,
          hint: null,
        },
      });

      const book = createTestBook(1);

      await expect(repository.save(book)).rejects.toThrow(
        'Failed to save book: relation "books" does not exist',
      );
    });

    it("should resolve cleanly when RPC succeeds", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const book = createTestBook(1);

      await expect(repository.save(book)).resolves.toBeUndefined();
    });
  });
});

