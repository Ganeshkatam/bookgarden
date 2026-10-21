import { assertCanonicalBookObjectKey } from "./CanonicalStorageKey";
import { ReaderAccessError } from "../errors/ReaderAccessError";

describe("CanonicalStorageKey & Database Parity Invariants", () => {
  const bookId = "00000000-0000-0000-0000-000000000001";
  const postgresRegex = /^[a-zA-Z0-9._ ()\-']+\.(pdf|epub)$/i;

  describe("Application and Database Regex Parity", () => {
    const validFilenames = [
      "book.pdf",
      "manuscript.epub",
      "Maths Sutra (PDFDrive).pdf",
      "The Monk's Ferrari.pdf",
      "Everything_Science-v1.0.pdf",
    ];

    const invalidFilenames = [
      'book"dangerous".pdf', // double quote rejected by both
      "book.exe", // invalid extension rejected by both
      "book.pdf?token=123", // query string rejected by both
      "book.pdf#section", // fragment rejected by both
      "sub/nested/book.pdf", // nested path rejected by both
      "../traversal.pdf", // traversal rejected by both
    ];

    it.each(validFilenames)("accepts valid filename '%s' in both application and SQL regex", (filename) => {
      const canonicalPath = `${bookId}/${filename}`;
      expect(assertCanonicalBookObjectKey(canonicalPath, bookId)).toBe(canonicalPath);
      expect(postgresRegex.test(filename)).toBe(true);
    });

    it.each(invalidFilenames)("rejects invalid filename '%s' in both application and SQL regex", (filename) => {
      const canonicalPath = `${bookId}/${filename}`;
      expect(() => assertCanonicalBookObjectKey(canonicalPath, bookId)).toThrow(ReaderAccessError);
      expect(postgresRegex.test(filename)).toBe(false);
    });
  });

  describe("assertCanonicalBookObjectKey strict boundary checks", () => {
    it("rejects double quotes in filenames", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/bad"name.pdf`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects non-pdf/epub extensions", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/script.sh`, bookId),
      ).toThrow(ReaderAccessError);

      expect(() =>
        assertCanonicalBookObjectKey(`${bookId}/document.docx`, bookId),
      ).toThrow(ReaderAccessError);
    });

    it("rejects empty, null, or undefined paths", () => {
      expect(() => assertCanonicalBookObjectKey("", bookId)).toThrow(ReaderAccessError);
      expect(() => assertCanonicalBookObjectKey(null, bookId)).toThrow(ReaderAccessError);
      expect(() => assertCanonicalBookObjectKey(undefined, bookId)).toThrow(ReaderAccessError);
    });

    it("strictly requires bookId prefix matching", () => {
      expect(() =>
        assertCanonicalBookObjectKey(`different-id/book.pdf`, bookId),
      ).toThrow(expect.objectContaining({ code: "STORAGE_PATH_BOOK_MISMATCH" }));
    });
  });
});
