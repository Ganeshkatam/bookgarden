import {
  getStoredCookieConsent,
  hasUserConsented,
  isStorageAllowed,
  saveCookieConsent,
  purgeNonEssentialStorage,
  purgeCategoryStorage,
  privacyStorage,
  safeStorage,
  checkCookieCapability,
  checkLocalStorageCapability,
  setStorageCapabilityOverride,
  clearMemoryStore,
  getMemoryStore,
  getCookie,
  setCookie,
  deleteCookie,
  COOKIE_CONSENT_STORAGE_KEY,
} from "./privacy-storage";

describe("Privacy Storage Guard & Central Storage Adapter", () => {
  beforeEach(() => {
    // Reset capability overrides, localStorage, cookies, and memory store
    setStorageCapabilityOverride(null);
    clearMemoryStore();
    window.localStorage.clear();

    // Clear all jsdom cookies
    if (document.cookie) {
      const cookies = document.cookie.split("; ");
      for (const c of cookies) {
        const name = c.split("=")[0];
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
  });

  afterEach(() => {
    setStorageCapabilityOverride(null);
  });

  describe("Required Test Matrix", () => {
    // Scenario 1: Cookies available; functional consent granted
    it("Scenario 1: Cookies available; functional consent granted -> persists in the approved primary store", () => {
      saveCookieConsent({ essential: true, functional: true, analytics: false });

      // Small functional preference defaults to cookie
      const themeResult = privacyStorage.setItem("theme", "dark", "functional", {
        preferredStore: "cookie",
      });

      expect(themeResult.stored).toBe(true);
      expect(themeResult.store).toBe("cookie");
      expect(themeResult.reason).toBe("success");
      expect(getCookie("theme")).toBe("dark");

      // Larger payload or explicitly preferred localStorage persists in localStorage
      const posResult = privacyStorage.setItem(
        "bookgarden_reader_pos_b1",
        JSON.stringify({ page: 5 }),
        "functional",
        { preferredStore: "localStorage" }
      );
      expect(posResult.stored).toBe(true);
      expect(posResult.store).toBe("localStorage");
      expect(window.localStorage.getItem("bookgarden_reader_pos_b1")).not.toBeNull();
    });

    // Scenario 2: Cookies blocked; functional consent granted
    it("Scenario 2: Cookies blocked; functional consent granted -> uses localStorage only if available and permitted", () => {
      // First save consent before simulating cookie block, or simulate cookie block during consent save
      // With cookies blocked, consent is saved to localStorage fallback
      setStorageCapabilityOverride({ cookies: false, localStorage: true });

      saveCookieConsent({ essential: true, functional: true, analytics: false });

      const consent = getStoredCookieConsent();
      expect(consent).not.toBeNull();
      expect(consent?.functional).toBe(true);

      // Attempt write with preferredStore="cookie", but cookies are blocked
      const result = privacyStorage.setItem("theme", "sepia", "functional", {
        preferredStore: "cookie",
      });

      expect(result.stored).toBe(true);
      expect(result.store).toBe("localStorage");
      expect(result.reason).toBe("success");
      expect(window.localStorage.getItem("theme")).toBe("sepia");
      expect(getCookie("theme")).toBeNull();
    });

    // Scenario 3: Optional cookies rejected
    it("Scenario 3: Optional cookies rejected -> no optional persistence in either store", () => {
      saveCookieConsent({ essential: true, functional: false, analytics: false });

      const themeResult = privacyStorage.setItem("theme", "dark", "functional");
      expect(themeResult.stored).toBe(false);
      expect(themeResult.store).toBe("memory");
      expect(themeResult.reason).toBe("consent_denied");

      // Verify no persistence in cookie or localStorage
      expect(getCookie("theme")).toBeNull();
      expect(window.localStorage.getItem("theme")).toBeNull();

      // In-memory retains for session only
      expect(getMemoryStore().get("theme")).toBe("dark");
    });

    // Scenario 4: Consent unknown
    it("Scenario 4: Consent unknown -> no optional persistence in either store", () => {
      // No consent has been saved
      expect(getStoredCookieConsent()).toBeNull();
      expect(hasUserConsented()).toBe(false);

      const result = privacyStorage.setItem("bookgarden_recent_searches", '["gatsby"]', "functional");
      expect(result.stored).toBe(false);
      expect(result.store).toBe("memory");
      expect(result.reason).toBe("consent_unknown");

      expect(getCookie("bookgarden_recent_searches")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_recent_searches")).toBeNull();
      expect(getMemoryStore().get("bookgarden_recent_searches")).toBe('["gatsby"]');
    });

    // Scenario 5: Cookies and localStorage unavailable
    it("Scenario 5: Cookies and localStorage unavailable -> keep preferences in memory", () => {
      // Consent recorded in memory
      setStorageCapabilityOverride({ cookies: false, localStorage: false });

      // In-memory fallback
      const result = privacyStorage.setItem("theme", "light", "essential");
      expect(result.stored).toBe(false);
      expect(result.store).toBe("memory");
      expect(result.reason).toBe("storage_unavailable");

      expect(privacyStorage.getItem("theme")).toBe("light");
      expect(getCookie("theme")).toBeNull();
      expect(window.localStorage.getItem("theme")).toBeNull();
    });

    // Scenario 6: Analytics rejected; functional accepted
    it("Scenario 6: Analytics rejected; functional accepted -> functional may persist, analytics may not", () => {
      saveCookieConsent({ essential: true, functional: true, analytics: false });

      // Functional allowed to persist
      const funcResult = privacyStorage.setItem("theme", "dark", "functional");
      expect(funcResult.stored).toBe(true);
      expect(funcResult.reason).toBe("success");

      // Analytics blocked from persistence
      const analyticsResult = privacyStorage.setItem("bookgarden_reader_dwell", "120", "analytics");
      expect(analyticsResult.stored).toBe(false);
      expect(analyticsResult.store).toBe("memory");
      expect(analyticsResult.reason).toBe("consent_denied");

      expect(window.localStorage.getItem("bookgarden_reader_dwell")).toBeNull();
      expect(getCookie("bookgarden_reader_dwell")).toBeNull();
    });

    // Scenario 7: Consent withdrawn
    it("Scenario 7: Consent withdrawn -> purges applicable optional data from both stores", () => {
      // Step 1: Accept all and persist data
      saveCookieConsent({ essential: true, functional: true, analytics: true });

      privacyStorage.setItem("theme", "dark", "functional", { preferredStore: "cookie" });
      privacyStorage.setItem("bookgarden_recent_searches", '["history"]', "functional", {
        preferredStore: "localStorage",
      });
      privacyStorage.setItem("bookgarden_reader_dwell", "85", "analytics", {
        preferredStore: "localStorage",
      });

      expect(getCookie("theme")).toBe("dark");
      expect(window.localStorage.getItem("bookgarden_recent_searches")).not.toBeNull();
      expect(window.localStorage.getItem("bookgarden_reader_dwell")).not.toBeNull();

      // Step 2: Withdraw functional and analytics consent
      saveCookieConsent({ essential: true, functional: false, analytics: false });

      // Both stores must be purged of non-essential data
      expect(getCookie("theme")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_recent_searches")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_reader_dwell")).toBeNull();

      // Consent record itself remains preserved
      expect(getStoredCookieConsent()?.essential).toBe(true);
    });

    // Scenario 8: Authentication cookie unavailable
    it("Scenario 8: Authentication cookie unavailable -> does not fall back to storing session secrets in localStorage", () => {
      const authTokens = [
        "sb-auth-token",
        "sb-12345-auth-token-code",
        "supabase.auth.token",
        "access_token",
        "refresh_token",
        "session_token",
      ];

      for (const tokenKey of authTokens) {
        const result = privacyStorage.setItem(tokenKey, "secret-jwt-token", "essential");
        expect(result.stored).toBe(false);
        expect(result.store).toBe("none");
        expect(result.reason).toBe("auth_token_forbidden");
        expect(window.localStorage.getItem(tokenKey)).toBeNull();
        expect(getCookie(tokenKey)).toBeNull();
      }
    });

    // Scenario 9: Stored consent is malformed or invalid
    it("Scenario 9: Stored consent is malformed or invalid -> treats optional consent as unknown", () => {
      // Write malformed JSON to cookie
      document.cookie = `${COOKIE_CONSENT_STORAGE_KEY}=invalid-json-content; path=/;`;
      expect(getStoredCookieConsent()).toBeNull();
      expect(isStorageAllowed("functional")).toBe(false);
      expect(isStorageAllowed("analytics")).toBe(false);

      // Write invalid schema object to localStorage
      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify({ randomKey: "bad-data" })
      );
      expect(getStoredCookieConsent()).toBeNull();
      expect(isStorageAllowed("functional")).toBe(false);

      // Persistence is blocked as unknown
      const result = privacyStorage.setItem("theme", "dark", "functional");
      expect(result.stored).toBe(false);
      expect(result.reason).toBe("consent_unknown");
    });
  });

  describe("Backward Compatibility (safeStorage)", () => {
    it("returns boolean from safeStorage.setItem and retrieves value via getItem", () => {
      saveCookieConsent({ essential: true, functional: true, analytics: true });

      const written = safeStorage.setItem("theme", "sepia", "functional");
      expect(written).toBe(true);
      expect(safeStorage.getItem("theme")).toBe("sepia");

      safeStorage.removeItem("theme");
      expect(safeStorage.getItem("theme")).toBeNull();
    });

    it("safeStorage.setItem returns false when consent is denied", () => {
      saveCookieConsent({ essential: true, functional: false, analytics: false });
      const written = safeStorage.setItem("theme", "dark", "functional");
      expect(written).toBe(false);
    });
  });

  describe("Cookie Deletion Robustness (B-09)", () => {
    it("deletes cookies across candidate paths and domains when specific attributes are omitted", () => {
      // Simulate setting cookie on root path
      document.cookie = "theme=dark; path=/; samesite=lax";
      expect(getCookie("theme")).toBe("dark");

      deleteCookie("theme");
      expect(getCookie("theme")).toBeNull();
    });

    it("purges cookies matching category prefixes even when created under custom subpaths", () => {
      // Set functional cookies
      document.cookie = "theme=sepia; path=/read; samesite=lax";
      document.cookie = "bookgarden_recent_searches=query; path=/; samesite=lax";

      purgeCategoryStorage("functional");

      expect(getCookie("theme")).toBeNull();
      expect(getCookie("bookgarden_recent_searches")).toBeNull();
    });
  });

  describe("Cross-Tab Consent Synchronization (B-10)", () => {
    it("propagates consent revocation across tabs via storage event and purges local category data", () => {
      // Initialize with full consent and cached data in tab 2
      saveCookieConsent({ essential: true, functional: true, analytics: true });
      privacyStorage.setItem("theme", "dark", "functional", { preferredStore: "cookie" });
      privacyStorage.setItem("bookgarden_reader_dwell", "45", "analytics", {
        preferredStore: "localStorage",
      });

      expect(getCookie("theme")).toBe("dark");
      expect(window.localStorage.getItem("bookgarden_reader_dwell")).toBe("45");

      // Listen for local custom event dispatch
      const consentListener = jest.fn();
      window.addEventListener("cookie-consent-updated", consentListener);

      // Simulate Tab 1 updating consent to revoke functional and analytics
      const updatedPrefs = {
        essential: true,
        functional: false,
        analytics: false,
        consentTimestamp: new Date().toISOString(),
      };

      const storageEvent = new StorageEvent("storage", {
        key: COOKIE_CONSENT_STORAGE_KEY,
        newValue: JSON.stringify(updatedPrefs),
        oldValue: JSON.stringify({ essential: true, functional: true, analytics: true }),
      });

      window.dispatchEvent(storageEvent);

      // Verify that tab 2 received the update, purged functional and analytics data
      expect(getCookie("theme")).toBeNull();
      expect(window.localStorage.getItem("bookgarden_reader_dwell")).toBeNull();
      expect(consentListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            functional: false,
            analytics: false,
          }),
        })
      );

      window.removeEventListener("cookie-consent-updated", consentListener);
    });

    it("purges all non-essential storage when consent is cleared in another tab", () => {
      saveCookieConsent({ essential: true, functional: true, analytics: true });
      privacyStorage.setItem("theme", "dark", "functional", { preferredStore: "cookie" });

      const clearEvent = new StorageEvent("storage", {
        key: COOKIE_CONSENT_STORAGE_KEY,
        newValue: null,
      });

      window.dispatchEvent(clearEvent);

      expect(getCookie("theme")).toBeNull();
    });
  });
});

