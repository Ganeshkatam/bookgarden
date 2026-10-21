export interface ReaderBookAvailabilityState {
  isPublished: boolean | null;
  isArchived: boolean | null;
}

export interface ReaderUserIdentity {
  id: string;
}

export type AccessDenialReason =
  | "UNAUTHENTICATED"
  | "BOOK_NOT_FOUND"
  | "BOOK_UNPUBLISHED"
  | "BOOK_ARCHIVED"
  | "MEMBER_ACCESS_DENIED";

export interface ReaderAccessEvaluation {
  allowed: boolean;
  reason?: AccessDenialReason;
}

/**
 * Evaluates publication availability.
 * Availability indicates whether the book is in an active, published, and unarchived catalog state.
 * NOTE: This is an availability lifecycle check, NOT a user entitlement check.
 */
export function isBookAvailableForReading(state: ReaderBookAvailabilityState): boolean {
  return state.isPublished === true && state.isArchived !== true;
}

/**
 * Evaluates whether an authenticated member identity is permitted to access the book in the reader.
 * In TomeSphere's V1 model, all active authenticated members are permitted to read active catalog books.
 * When per-title purchases, subscriptions, or institutional access tiers are introduced,
 * they integrate into this authorization rule.
 */
export function isAuthenticatedMemberAllowedToReadBook(
  user: ReaderUserIdentity | null,
  bookId: string,
): boolean {
  if (!user || !user.id || !bookId) {
    return false;
  }
  // All authenticated members in good standing are allowed to read active catalog books in V1
  return true;
}

// Backward-compatible alias for existing tests
export const isUserEntitledToReadBook = isAuthenticatedMemberAllowedToReadBook;

/**
 * Full access gate: requires an authenticated user identity, an active publication state,
 * and valid member authorization.
 */
export function evaluateReaderAccess(
  user: ReaderUserIdentity | null,
  book: { id: string; isPublished: boolean | null; isArchived: boolean | null } | null,
): ReaderAccessEvaluation {
  if (!user) {
    return { allowed: false, reason: "UNAUTHENTICATED" };
  }

  if (!book) {
    return { allowed: false, reason: "BOOK_NOT_FOUND" };
  }

  if (book.isArchived === true) {
    return { allowed: false, reason: "BOOK_ARCHIVED" };
  }

  if (book.isPublished !== true) {
    return { allowed: false, reason: "BOOK_UNPUBLISHED" };
  }

  if (!isAuthenticatedMemberAllowedToReadBook(user, book.id)) {
    return { allowed: false, reason: "MEMBER_ACCESS_DENIED" };
  }

  return { allowed: true };
}
