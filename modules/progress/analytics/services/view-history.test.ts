import {
  addToViewHistory,
  getViewHistory,
  clearViewHistory,
} from "./view-history";
import {
  saveCookieConsent,
  clearMemoryStore,
  deleteCookie,
  COOKIE_CONSENT_STORAGE_KEY,
  STORAGE_KEYS,
} from "@/shared/core/storage/privacy-storage";
import { BookDto } from "@/modules/library/application/dto/response/BookDto";

const mockBook: BookDto = {
  id: "test-book-1",
  title: "The Great Gatsby",
  authors: [{ id: "a1", name: "F. Scott Fitzgerald", slug: "f-scott-fitzgerald" }],
  genres: [{ id: "g1", name: "Classic Fiction", slug: "classic-fiction" }],
  subjects: [],
  coverUrl: "https://example.com/gatsby.jpg",
  isTextbook: false,
  isFeatured: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("view-history service", () => {
  beforeEach(() => {
    window.localStorage.clear();
    deleteCookie(COOKIE_CONSENT_STORAGE_KEY);
    clearMemoryStore();
  });

  it("strictly blocks recording or retrieving view history when analytics consent is absent", () => {
    addToViewHistory(mockBook);
    expect(getViewHistory()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEYS.RECENT_VIEWS)).toBeNull();
  });

  it("strictly blocks recording view history when user rejected analytics but accepted functional", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: false });
    addToViewHistory(mockBook);
    expect(getViewHistory()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEYS.RECENT_VIEWS)).toBeNull();
  });

  it("records and retrieves view history when analytics consent is granted", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: true });
    addToViewHistory(mockBook);

    const history = getViewHistory();
    expect(history.length).toBe(1);
    expect(history[0].book.id).toBe("test-book-1");
  });

  it("clears view history", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: true });
    addToViewHistory(mockBook);
    expect(getViewHistory().length).toBe(1);

    clearViewHistory();
    expect(getViewHistory()).toEqual([]);
  });

  it("retains a maximum of exactly 20 history entries when more than 20 items are added", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: true });

    // Add 25 distinct books
    for (let i = 1; i <= 25; i++) {
      addToViewHistory({
        ...mockBook,
        id: `test-book-${i}`,
        title: `Book Title ${i}`,
      });
    }

    const history = getViewHistory();
    expect(history.length).toBe(20);
    // Most recently added book should be at the front
    expect(history[0].book.id).toBe("test-book-25");
    // Oldest items (1 through 5) should have been pruned
    expect(history[19].book.id).toBe("test-book-6");
    expect(history.find((item) => item.book.id === "test-book-1")).toBeUndefined();
  });
});
