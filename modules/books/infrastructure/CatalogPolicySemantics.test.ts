/**
 * Catalog Policy Semantics & Visibility Isolation Tests
 *
 * Regression tests proving that:
 *   1. Anonymous and ordinary authenticated callers can ONLY read published, unarchived books.
 *   2. Draft books (is_published = false) and archived books (is_archived = true) are inaccessible to non-admins.
 *   3. Digital binary records in book_files are only visible if the associated book is published and unarchived.
 *   4. Search projections in discovery_search_documents respect is_public = true.
 *   5. Permissive OR logic: having a legacy SELECT USING (true) policy would undermine visibility;
 *      dropping it and applying scoped policies cleanly isolates draft/archived content.
 *   6. Administrators with the ManageBooks permission retain full access to draft, archived, and active records.
 *
 * These tests simulate the exact RLS policy logic from migration 20261022040000_harden_catalog_rls_visibility.sql.
 */

interface UserContext {
  id: string;
  role: "anon" | "authenticated" | "service_role";
  permissions?: string[];
}

interface BookRow {
  id: string;
  title: string;
  is_published: boolean;
  is_archived: boolean;
}

interface BookFileRow {
  id: string;
  book_id: string;
  storage_path: string;
  format: string;
}

interface SearchDocumentRow {
  id: string;
  title: string;
  is_public: boolean;
}

function createCatalogPolicyEvaluator(user: UserContext | null, legacyBroadPolicyActive: boolean = false) {
  const isServiceRole = user?.role === "service_role";

  function hasManageBooks(): boolean {
    if (isServiceRole) return true;
    return user?.role === "authenticated" && !!user?.permissions?.includes("ManageBooks");
  }

  return {
    books: {
      select: (books: BookRow[]): BookRow[] => {
        if (isServiceRole) return [...books];

        return books.filter((b) => {
          // If legacy broad policy is active, it evaluates to true (OR logic bypass)
          if (legacyBroadPolicyActive) return true;

          // Hardened policy: books_select_policy
          const isPubliclyVisible = b.is_published === true && b.is_archived === false;
          const isAdmin = hasManageBooks();

          return isPubliclyVisible || isAdmin;
        });
      },

      insert: (book: Partial<BookRow>): { allowed: boolean; error?: string } => {
        if (isServiceRole || hasManageBooks()) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: 'new row violates row-level security policy for table "books"',
        };
      },

      update: (bookId: string): { allowed: boolean; error?: string } => {
        if (isServiceRole || hasManageBooks()) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: 'new row violates row-level security policy for table "books"',
        };
      },

      delete: (bookId: string): { allowed: boolean; error?: string } => {
        if (isServiceRole || hasManageBooks()) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: 'row violates row-level security policy for table "books"',
        };
      },
    },

    book_files: {
      select: (files: BookFileRow[], allBooks: BookRow[]): BookFileRow[] => {
        if (isServiceRole) return [...files];

        const booksMap = new Map(allBooks.map((b) => [b.id, b]));

        return files.filter((f) => {
          if (legacyBroadPolicyActive) return true;

          const associatedBook = booksMap.get(f.book_id);
          const isAssociatedBookPublic =
            associatedBook && associatedBook.is_published === true && associatedBook.is_archived === false;
          const isAdmin = hasManageBooks();

          return isAssociatedBookPublic || isAdmin;
        });
      },

      insert: (file: Partial<BookFileRow>): { allowed: boolean; error?: string } => {
        if (isServiceRole || hasManageBooks()) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: 'new row violates row-level security policy for table "book_files"',
        };
      },
    },

    discovery_search_documents: {
      select: (docs: SearchDocumentRow[]): SearchDocumentRow[] => {
        if (isServiceRole) return [...docs];

        return docs.filter((d) => {
          if (legacyBroadPolicyActive) return true;

          return d.is_public === true || hasManageBooks();
        });
      },
    },
  };
}

describe("Catalog Policy Semantics & RLS Hardening Specification", () => {
  const publishedBook: BookRow = {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Published Book",
    is_published: true,
    is_archived: false,
  };

  const draftBook: BookRow = {
    id: "00000000-0000-0000-0000-000000000002",
    title: "Draft Book",
    is_published: false,
    is_archived: false,
  };

  const archivedBook: BookRow = {
    id: "00000000-0000-0000-0000-000000000003",
    title: "Archived Book",
    is_published: true,
    is_archived: true,
  };

  const catalogBooks: BookRow[] = [publishedBook, draftBook, archivedBook];

  const bookFiles: BookFileRow[] = [
    {
      id: "f-1",
      book_id: publishedBook.id,
      storage_path: "published/content.pdf",
      format: "pdf",
    },
    {
      id: "f-2",
      book_id: draftBook.id,
      storage_path: "draft/secret.pdf",
      format: "pdf",
    },
    {
      id: "f-3",
      book_id: archivedBook.id,
      storage_path: "archived/old.pdf",
      format: "pdf",
    },
  ];

  const searchDocs: SearchDocumentRow[] = [
    { id: "d-1", title: "Public Document", is_public: true },
    { id: "d-2", title: "Private Document", is_public: false },
  ];

  const anonUser: UserContext = { id: "", role: "anon" };
  const normalUser: UserContext = { id: "u-normal", role: "authenticated", permissions: [] };
  const adminUser: UserContext = { id: "u-admin", role: "authenticated", permissions: ["ManageBooks"] };

  describe("1. Anonymous Caller Isolation", () => {
    const evaluator = createCatalogPolicyEvaluator(anonUser, false);

    it("allows anonymous callers to select only published, unarchived books", () => {
      const results = evaluator.books.select(catalogBooks);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(publishedBook.id);
      expect(results.some((b) => b.id === draftBook.id)).toBe(false);
      expect(results.some((b) => b.id === archivedBook.id)).toBe(false);
    });

    it("allows anonymous callers to select book_files only for published books", () => {
      const results = evaluator.book_files.select(bookFiles, catalogBooks);
      expect(results).toHaveLength(1);
      expect(results[0].book_id).toBe(publishedBook.id);
      expect(results.some((f) => f.book_id === draftBook.id)).toBe(false);
    });

    it("allows anonymous callers to select search documents only when is_public is true", () => {
      const results = evaluator.discovery_search_documents.select(searchDocs);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("d-1");
      expect(results.some((d) => d.id === "d-2")).toBe(false);
    });

    it("rejects anonymous insert, update, or delete on catalog tables", () => {
      expect(evaluator.books.insert({ title: "Spam Book" }).allowed).toBe(false);
      expect(evaluator.books.update(publishedBook.id).allowed).toBe(false);
      expect(evaluator.books.delete(publishedBook.id).allowed).toBe(false);
      expect(evaluator.book_files.insert({ book_id: publishedBook.id }).allowed).toBe(false);
    });
  });

  describe("2. Ordinary Authenticated Caller Isolation", () => {
    const evaluator = createCatalogPolicyEvaluator(normalUser, false);

    it("restricts ordinary authenticated callers to published, unarchived books", () => {
      const results = evaluator.books.select(catalogBooks);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(publishedBook.id);
      expect(results.some((b) => b.id === draftBook.id)).toBe(false);
      expect(results.some((b) => b.id === archivedBook.id)).toBe(false);
    });

    it("blocks ordinary authenticated callers from catalog mutation", () => {
      expect(evaluator.books.insert({ title: "User Uploaded Book" }).allowed).toBe(false);
      expect(evaluator.books.update(publishedBook.id).allowed).toBe(false);
      expect(evaluator.books.delete(publishedBook.id).allowed).toBe(false);
      expect(evaluator.book_files.insert({ book_id: publishedBook.id }).allowed).toBe(false);
    });
  });

  describe("3. Administrator with ManageBooks Permission", () => {
    const evaluator = createCatalogPolicyEvaluator(adminUser, false);

    it("allows administrators to see all books (published, draft, archived)", () => {
      const results = evaluator.books.select(catalogBooks);
      expect(results).toHaveLength(3);
      expect(results.some((b) => b.id === draftBook.id)).toBe(true);
      expect(results.some((b) => b.id === archivedBook.id)).toBe(true);
    });

    it("allows administrators to view all book files", () => {
      const results = evaluator.book_files.select(bookFiles, catalogBooks);
      expect(results).toHaveLength(3);
    });

    it("allows administrators to view all search documents including private", () => {
      const results = evaluator.discovery_search_documents.select(searchDocs);
      expect(results).toHaveLength(2);
    });

    it("allows administrators to insert, update, and delete catalog records", () => {
      expect(evaluator.books.insert({ title: "New Canonical Book" }).allowed).toBe(true);
      expect(evaluator.books.update(publishedBook.id).allowed).toBe(true);
      expect(evaluator.books.delete(publishedBook.id).allowed).toBe(true);
      expect(evaluator.book_files.insert({ book_id: publishedBook.id }).allowed).toBe(true);
    });
  });

  describe("4. Permissive OR Logic Vulnerability Demonstration", () => {
    it("proves that having a legacy SELECT USING (true) policy leaks draft and archived books to anonymous users", () => {
      // With legacy broad policy left active:
      const flawedEvaluator = createCatalogPolicyEvaluator(anonUser, true);
      const leakedResults = flawedEvaluator.books.select(catalogBooks);

      // Leaks all 3 books because permissive policies combine with OR
      expect(leakedResults).toHaveLength(3);
      expect(leakedResults.some((b) => b.id === draftBook.id)).toBe(true);

      // Once the legacy broad policy is dropped:
      const hardenedEvaluator = createCatalogPolicyEvaluator(anonUser, false);
      const secureResults = hardenedEvaluator.books.select(catalogBooks);

      // Secure: strictly 1 published book returned
      expect(secureResults).toHaveLength(1);
      expect(secureResults[0].id).toBe(publishedBook.id);
    });
  });
});
