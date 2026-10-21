import { ReaderAccessError } from "../errors/ReaderAccessError";

/**
 * Validates and asserts that a given storage path adheres strictly to the
 * canonical book object key contract:
 *
 *   <book_id>/<safe_filename>
 *
 * Enforces positive grammar and strict security invariants:
 * 1. Root component MUST match the exact bookId passed.
 * 2. No scheme (http/https).
 * 3. No bucket prefixes (e.g. 'book-pdfs/').
 * 4. No leading or trailing slashes, or redundant separators.
 * 5. No directory traversal ('..').
 * 6. No backslashes ('\').
 * 7. No URI query ('?') or fragment ('#') components.
 * 8. No percent-encoded path separators ('%2f', '%2F').
 * 9. Exactly two path components (bookId and filename).
 * 10. Filename must have a recognized, safe book extension (.pdf or .epub).
 */
export function assertCanonicalBookObjectKey(
  storagePath: string | null | undefined,
  bookId: string,
): string {
  if (!storagePath || typeof storagePath !== "string") {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "INVALID_CANONICAL_STORAGE_PATH",
    );
  }

  const trimmed = storagePath.trim();

  if (
    trimmed.length === 0 ||
    trimmed.startsWith("/") ||
    trimmed.endsWith("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("..") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    trimmed.toLowerCase().includes("%2f") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("book-pdfs/")
  ) {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "INVALID_CANONICAL_STORAGE_PATH",
    );
  }

  // Exactly two segments: <book_id>/<filename>
  const parts = trimmed.split("/");
  if (parts.length !== 2) {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "INVALID_CANONICAL_STORAGE_PATH",
    );
  }

  const [pathBookId, filename] = parts;

  // Crucial invariant: The first component MUST match the target bookId
  if (pathBookId !== bookId) {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "STORAGE_PATH_BOOK_MISMATCH",
    );
  }

  // Filename positive validation: letters, digits, spaces, dots, dashes, underscores, parentheses, quotes
  if (!filename || filename.length > 255 || !/^[a-zA-Z0-9._ ()\-']+$/.test(filename)) {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "INVALID_CANONICAL_STORAGE_PATH",
    );
  }

  // File extension validation
  if (!/\.(pdf|epub)$/i.test(filename)) {
    throw new ReaderAccessError(
      "Book content unavailable",
      500,
      "INVALID_CANONICAL_STORAGE_PATH",
    );
  }

  return trimmed;
}
