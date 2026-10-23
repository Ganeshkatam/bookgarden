import { getRecentSearches, saveRecentSearch } from "./SearchClient";
import {
  saveCookieConsent,
  clearMemoryStore,
  deleteCookie,
  COOKIE_CONSENT_STORAGE_KEY,
  STORAGE_KEYS,
  STORAGE_LIMITS,
} from "@/shared/core/storage/privacy-storage";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("SearchClient — Recent Searches Retention Limit", () => {
  beforeEach(() => {
    window.localStorage.clear();
    deleteCookie(COOKIE_CONSENT_STORAGE_KEY);
    clearMemoryStore();
  });

  it("STORAGE_LIMITS defines MAX_RECENT_SEARCHES as exactly 5", () => {
    expect(STORAGE_LIMITS.MAX_RECENT_SEARCHES).toBe(5);
  });

  it("strictly blocks saving recent searches when functional consent is denied", () => {
    saveCookieConsent({ essential: true, functional: false, analytics: true });

    saveRecentSearch("dostoevsky");

    expect(getRecentSearches()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES)).toBeNull();
  });

  it("retains a maximum of exactly 5 recent searches when more than 5 queries are saved", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: false });

    const queries = [
      "query 1",
      "query 2",
      "query 3",
      "query 4",
      "query 5",
      "query 6",
      "query 7",
    ];

    for (const q of queries) {
      saveRecentSearch(q);
    }

    const recent = getRecentSearches();
    expect(recent.length).toBe(5);
    // Most recent query must be first
    expect(recent[0]).toBe("query 7");
    expect(recent[1]).toBe("query 6");
    expect(recent[2]).toBe("query 5");
    expect(recent[3]).toBe("query 4");
    expect(recent[4]).toBe("query 3");
    // Queries 1 and 2 should have been pruned
    expect(recent).not.toContain("query 1");
    expect(recent).not.toContain("query 2");
  });

  it("deduplicates identical searches and moves them to the front while preserving max 5 limit", () => {
    saveCookieConsent({ essential: true, functional: true, analytics: false });

    saveRecentSearch("alpha");
    saveRecentSearch("beta");
    saveRecentSearch("gamma");
    saveRecentSearch("delta");
    saveRecentSearch("epsilon");

    expect(getRecentSearches().length).toBe(5);

    // Re-save "alpha" (already in list)
    saveRecentSearch("alpha");

    const recent = getRecentSearches();
    expect(recent.length).toBe(5);
    expect(recent[0]).toBe("alpha");
    expect(recent[1]).toBe("epsilon");
    expect(recent[2]).toBe("delta");
    expect(recent[3]).toBe("gamma");
    expect(recent[4]).toBe("beta");
  });
});
