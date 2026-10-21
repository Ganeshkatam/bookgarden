/**
 * Privacy Storage Guard
 * Enforces strict consent policies: until and unless the user explicitly grants consent,
 * non-essential data (functional preferences, analytics, local history/cache) is NEVER stored.
 */

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  consentTimestamp: string;
}

export const COOKIE_CONSENT_STORAGE_KEY = "bookgarden_cookie_consent";

/**
 * Known non-essential localStorage keys used across the platform.
 */
const NON_ESSENTIAL_KEY_PREFIXES = [
  "bookgarden_recent_searches",
  "bookgarden_view_history",
  "bookgarden_reading_pos_",
  "bookgarden_reading_progress_",
  "bookgarden_announcement_seen_",
  "bookgarden_announcement_banner_dismissed_",
  "bookgarden_top_banner_dismissed_",
  "bookgarden_tour_",
  "bookgarden_welcome_tour_",
  "bookgarden_reader_dwell",
  "bookgarden-theme",
  "theme",
];

/**
 * Retrieves the stored user cookie preferences, or null if no consent has been given yet.
 */
export function getStoredCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Checks whether the user has explicitly recorded their cookie consent choices.
 */
export function hasUserConsented(): boolean {
  return getStoredCookieConsent() !== null;
}

/**
 * Checks whether storage for a specific category is authorized by user consent.
 * Strictly returns false if the user has not yet interacted with the consent banner.
 */
export function isStorageAllowed(category: "essential" | "functional" | "analytics"): boolean {
  if (category === "essential") return true;
  const consent = getStoredCookieConsent();
  if (!consent) return false;
  return Boolean(consent[category]);
}

/**
 * Purges all non-essential cached data and cookies from the user's browser.
 */
export function purgeNonEssentialStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key !== COOKIE_CONSENT_STORAGE_KEY) {
        const isNonEssential = NON_ESSENTIAL_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
        if (isNonEssential) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Saves user cookie consent choices and purges non-consented data if necessary.
 */
export function saveCookieConsent(
  prefs: Omit<CookiePreferences, "consentTimestamp">
): CookiePreferences {
  const fullPrefs: CookiePreferences = {
    ...prefs,
    essential: true, // Always locked true for fundamental security
    consentTimestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(fullPrefs));
      
      // If functional or analytics storage is rejected, purge non-essential data
      if (!fullPrefs.functional || !fullPrefs.analytics) {
        purgeNonEssentialStorage();
      }

      window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: fullPrefs }));
    } catch {}
  }
  return fullPrefs;
}

/**
 * Safe client-side storage wrapper that enforces privacy consent before writing data.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(
    key: string,
    value: string,
    category: "essential" | "functional" | "analytics" = "functional"
  ): boolean {
    if (typeof window === "undefined" || !window.localStorage) return false;
    // Strict block: Do not write data if consent has not been granted for this category
    if (!isStorageAllowed(category)) {
      return false;
    }
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};
