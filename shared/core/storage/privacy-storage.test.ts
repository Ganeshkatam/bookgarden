import {
  getStoredCookieConsent,
  hasUserConsented,
  isStorageAllowed,
  saveCookieConsent,
  purgeNonEssentialStorage,
  safeStorage,
  COOKIE_CONSENT_STORAGE_KEY,
} from "./privacy-storage";

describe("Privacy Storage Guard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Pre-consent state (No consent choice made yet)", () => {
    it("returns null for getStoredCookieConsent and false for hasUserConsented", () => {
      expect(getStoredCookieConsent()).toBeNull();
      expect(hasUserConsented()).toBe(false);
    });

    it("allows essential storage but blocks functional and analytics storage", () => {
      expect(isStorageAllowed("essential")).toBe(true);
      expect(isStorageAllowed("functional")).toBe(false);
      expect(isStorageAllowed("analytics")).toBe(false);
    });

    it("strictly blocks safeStorage.setItem for functional data before consent is granted", () => {
      const written = safeStorage.setItem("theme", "dark", "functional");
      expect(written).toBe(false);
      expect(window.localStorage.getItem("theme")).toBeNull();
    });

    it("strictly blocks safeStorage.setItem for analytics data before consent is granted", () => {
      const written = safeStorage.setItem("bookgarden_reader_dwell", "120", "analytics");
      expect(written).toBe(false);
      expect(window.localStorage.getItem("bookgarden_reader_dwell")).toBeNull();
    });
  });

  describe("Post-consent: Essential Only (Non-essential rejected)", () => {
    beforeEach(() => {
      saveCookieConsent({ essential: true, functional: false, analytics: false });
    });

    it("records consent choice with functional=false and analytics=false", () => {
      const consent = getStoredCookieConsent();
      expect(consent).not.toBeNull();
      expect(consent?.essential).toBe(true);
      expect(consent?.functional).toBe(false);
      expect(consent?.analytics).toBe(false);
      expect(hasUserConsented()).toBe(true);
    });

    it("refuses to store functional data in localStorage", () => {
      const written = safeStorage.setItem("bookgarden_recent_searches", '["gatsby"]', "functional");
      expect(written).toBe(false);
      expect(window.localStorage.getItem("bookgarden_recent_searches")).toBeNull();
    });

    it("purges any pre-existing non-essential data on save", () => {
      window.localStorage.setItem("theme", "light");
      window.localStorage.setItem("bookgarden_recent_searches", '["history"]');

      saveCookieConsent({ essential: true, functional: false, analytics: false });

      expect(window.localStorage.getItem("theme")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_recent_searches")).toBeNull();
      // Consent key itself remains preserved
      expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("Post-consent: Full Acceptance", () => {
    beforeEach(() => {
      saveCookieConsent({ essential: true, functional: true, analytics: true });
    });

    it("allows functional data storage when granted", () => {
      const written = safeStorage.setItem("theme", "dark", "functional");
      expect(written).toBe(true);
      expect(safeStorage.getItem("theme")).toBe("dark");
    });

    it("allows analytics data storage when granted", () => {
      const written = safeStorage.setItem("bookgarden_reader_dwell", "45", "analytics");
      expect(written).toBe(true);
      expect(safeStorage.getItem("bookgarden_reader_dwell")).toBe("45");
    });

    it("removes items via safeStorage.removeItem", () => {
      safeStorage.setItem("theme", "sepia", "functional");
      safeStorage.removeItem("theme");
      expect(safeStorage.getItem("theme")).toBeNull();
    });
  });

  describe("Storage Purge", () => {
    it("deletes all registered non-essential keys during purgeNonEssentialStorage", () => {
      window.localStorage.setItem("theme", "dark");
      window.localStorage.setItem("bookgarden_reading_pos_book1", '{"page": 10}');
      window.localStorage.setItem("bookgarden_announcement_seen_ann1", "true");

      purgeNonEssentialStorage();

      expect(window.localStorage.getItem("theme")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_reading_pos_book1")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_announcement_seen_ann1")).toBeNull();
    });
  });
});
