/**
 * Privacy Storage Guard & Central Storage Adapter
 *
 * Enforces a cookie-first, consent-aware storage architecture:
 * 1. Distinguishes between browser technical limitations (cookies blocked) and user privacy choices (optional consent denied).
 * 2. Never interprets a browser blocking cookies as user rejection, nor does it interpret cookie failure as permission to bypass consent.
 * 3. Store preferences in first-party cookies first. Fall back to localStorage only if permitted by consent.
 * 4. Larger payloads (reader positions, search history, view history) prefer localStorage.
 * 5. Authentication tokens must NEVER be stored in JavaScript cookies or localStorage.
 * 6. If storage is unavailable or consent is not granted, keep data in memory for the session only.
 */

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  consentTimestamp: string;
}

export type StorageCategory = "essential" | "functional" | "analytics";

export type PreferredStore = "cookie" | "localStorage";

export interface StorageOptions {
  preferredStore?: PreferredStore;
  path?: string;
  maxAge?: number;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  domain?: string;
}

export type PersistenceStore = "cookie" | "localStorage" | "memory" | "none";

export type PersistenceReason =
  | "success"
  | "consent_denied"
  | "consent_unknown"
  | "storage_unavailable"
  | "auth_token_forbidden"
  | "quota_exceeded";

export interface StorageResult {
  stored: boolean;
  store: PersistenceStore;
  reason: PersistenceReason;
}

export const COOKIE_CONSENT_STORAGE_KEY = "bookgarden_cookie_consent";

/**
 * Functional storage prefixes across the platform.
 */
export const FUNCTIONAL_KEY_PREFIXES = [
  "bookgarden_recent_searches",
  "bookgarden_reader_pos_",
  "bookgarden_reading_pos_",
  "bookgarden_reading_progress_",
  "bookgarden_announcement_seen_",
  "bookgarden_announcement_banner_dismissed_",
  "bookgarden_top_banner_dismissed_",
  "bookgarden_tour_",
  "bookgarden_welcome_tour_",
  "bookgarden-theme",
  "theme",
];

/**
 * Analytics storage prefixes across the platform.
 */
export const ANALYTICS_KEY_PREFIXES = [
  "bookgarden_view_history",
  "bookgarden_reader_dwell",
  "bookgarden_reading_velocity_",
  "bookgarden_analytics_",
];

/**
 * Patterns matching sensitive authentication tokens that must NEVER be persisted via client storage.
 */
const BLOCKED_AUTH_PATTERNS = [
  /^sb-.*auth[-_]?token.*$/i,
  /^sb-.*$/i,
  /supabase\.auth\.token/i,
  /access_token/i,
  /refresh_token/i,
  /session_token/i,
  /auth[-_]?token/i,
];

/**
 * In-memory fallback store when persistence is unavailable or consent is withheld.
 */
const memoryStore = new Map<string, string>();

/**
 * Capability override hook for deterministic testing.
 */
let capabilityOverride: { cookies?: boolean; localStorage?: boolean } | null = null;

export function setStorageCapabilityOverride(
  override: { cookies?: boolean; localStorage?: boolean } | null
): void {
  capabilityOverride = override;
}

export function getMemoryStore(): Map<string, string> {
  return memoryStore;
}

export function clearMemoryStore(): void {
  memoryStore.clear();
}

/**
 * Checks whether the browser environment currently supports reading and writing first-party cookies.
 */
export function checkCookieCapability(): boolean {
  if (capabilityOverride?.cookies !== undefined) {
    return capabilityOverride.cookies;
  }
  if (typeof document === "undefined") return false;
  try {
    const testKey = "__bg_cap_test__";
    document.cookie = `${testKey}=1; path=/; SameSite=Lax`;
    const capable = document.cookie.includes(`${testKey}=1`);
    document.cookie = `${testKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    return capable;
  } catch {
    return false;
  }
}

/**
 * Checks whether localStorage is available and operational.
 */
export function checkLocalStorageCapability(): boolean {
  if (capabilityOverride?.localStorage !== undefined) {
    return capabilityOverride.localStorage;
  }
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const testKey = "__bg_ls_test__";
    window.localStorage.setItem(testKey, "1");
    const val = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    return val === "1";
  } catch {
    return false;
  }
}

/**
 * Checks whether any reliable persistence layer is available.
 */
export function isPersistenceReliable(): boolean {
  return checkCookieCapability() || checkLocalStorageCapability();
}

/**
 * Checks whether a key corresponds to an authentication or session secret.
 */
export function isAuthTokenKey(key: string): boolean {
  return BLOCKED_AUTH_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Reads a cookie value by name.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookieStr = document.cookie || "";
    if (!cookieStr) return null;
    const cookies = cookieStr.split("; ");
    const prefix = `${encodeURIComponent(name)}=`;
    for (const cookie of cookies) {
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets a first-party cookie with secure defaults.
 */
export function setCookie(name: string, value: string, options: StorageOptions = {}): boolean {
  if (typeof document === "undefined" || !checkCookieCapability()) return false;
  try {
    const {
      path = "/",
      maxAge = 31536000, // 1 year
      sameSite = "lax",
      secure = typeof location !== "undefined" && location.protocol === "https:",
      domain,
    } = options;

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
    if (secure) {
      cookieStr += "; secure";
    }
    if (domain) {
      cookieStr += `; domain=${domain}`;
    }

    document.cookie = cookieStr;
    return getCookie(name) === value;
  } catch {
    return false;
  }
}

/**
 * Deletes a cookie matching the given name and attributes.
 */
export function deleteCookie(name: string, options: { path?: string; domain?: string } = {}): void {
  if (typeof document === "undefined") return;
  try {
    const { path = "/", domain } = options;
    let cookieStr = `${encodeURIComponent(name)}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
    if (domain) {
      cookieStr += `; domain=${domain}`;
    }
    document.cookie = cookieStr;
  } catch {}
}

/**
 * Validates whether an unknown object conforms to the CookiePreferences contract.
 */
export function isValidConsent(obj: unknown): obj is CookiePreferences {
  if (typeof obj !== "object" || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.essential === "boolean" &&
    typeof candidate.functional === "boolean" &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.consentTimestamp === "string"
  );
}

/**
 * Retrieves the stored user cookie preferences.
 * Checks cookie first, then falls back to localStorage.
 * Returns null if no consent has been recorded or if the stored payload is malformed.
 */
export function getStoredCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;

  // 1. Cookie-first check
  const cookieRaw = getCookie(COOKIE_CONSENT_STORAGE_KEY);
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (isValidConsent(parsed)) {
        return parsed;
      }
    } catch {
      // Malformed cookie record, fall through to localStorage
    }
  }

  // 2. LocalStorage fallback check
  if (checkLocalStorageCapability()) {
    try {
      const lsRaw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (isValidConsent(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Malformed localStorage record
    }
  }

  return null;
}

/**
 * Checks whether the user has explicitly recorded their cookie consent choices.
 */
export function hasUserConsented(): boolean {
  return getStoredCookieConsent() !== null;
}

/**
 * Checks whether storage for a specific category is authorized by user consent.
 * Essential is always true.
 * Functional and analytics require explicit consent; if consent is absent or unknown, returns false.
 */
export function isStorageAllowed(category: StorageCategory): boolean {
  if (category === "essential") return true;
  const consent = getStoredCookieConsent();
  if (!consent) return false;
  return Boolean(consent[category]);
}

/**
 * Purges cached data and cookies belonging to a specific non-essential category.
 */
export function purgeCategoryStorage(category: "functional" | "analytics"): void {
  const prefixes =
    category === "functional"
      ? FUNCTIONAL_KEY_PREFIXES
      : ANALYTICS_KEY_PREFIXES;

  // Purge matching cookies
  if (typeof document !== "undefined" && document.cookie) {
    try {
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const name = decodeURIComponent(cookie.split("=")[0].trim());
        if (name !== COOKIE_CONSENT_STORAGE_KEY) {
          const matches = prefixes.some(
            (p) => name === p || name.startsWith(p)
          );
          if (matches) {
            deleteCookie(name, { path: "/" });
          }
        }
      }
    } catch {}
  }

  // Purge matching localStorage keys
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key !== COOKIE_CONSENT_STORAGE_KEY) {
          const matches = prefixes.some(
            (p) => key === p || key.startsWith(p)
          );
          if (matches) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {}
  }

  // Purge matching in-memory entries
  for (const key of memoryStore.keys()) {
    if (prefixes.some((p) => key === p || key.startsWith(p))) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Purges all non-essential cached data and cookies from both cookies and localStorage.
 */
export function purgeNonEssentialStorage(): void {
  purgeCategoryStorage("functional");
  purgeCategoryStorage("analytics");
}

/**
 * Saves user cookie consent choices.
 * Writes to cookies first, mirrors to localStorage for recovery if supported.
 * Automatically purges previously stored data in categories no longer allowed.
 */
export function saveCookieConsent(
  prefs: Omit<CookiePreferences, "consentTimestamp">
): CookiePreferences {
  const fullPrefs: CookiePreferences = {
    ...prefs,
    essential: true, // Always locked true for fundamental security
    consentTimestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(fullPrefs);

  // 1. Try cookie storage
  if (checkCookieCapability()) {
    setCookie(COOKIE_CONSENT_STORAGE_KEY, payload, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }

  // 2. Mirror to localStorage if available
  if (checkLocalStorageCapability()) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, payload);
    } catch {}
  }

  // 3. Purge data for rejected or withdrawn categories
  if (!fullPrefs.functional) {
    purgeCategoryStorage("functional");
  }
  if (!fullPrefs.analytics) {
    purgeCategoryStorage("analytics");
  }

  // 4. Notify components of consent updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cookie-consent-updated", { detail: fullPrefs })
    );
  }

  return fullPrefs;
}

/**
 * Central Privacy Storage Adapter
 */
export const privacyStorage = {
  /**
   * Reads a value by checking cookies first, then localStorage, then in-memory store.
   * If a non-essential category is specified and consent was denied or unknown, refuses to return persisted data.
   */
  getItem(key: string, category?: StorageCategory): string | null {
    if (isAuthTokenKey(key)) return null;

    if (category && category !== "essential" && !isStorageAllowed(category)) {
      // Consent not granted for this category: strictly return null
      return null;
    }

    // 1. Try cookie
    const cookieVal = getCookie(key);
    if (cookieVal !== null) return cookieVal;

    // 2. Try localStorage
    if (checkLocalStorageCapability()) {
      try {
        const lsVal = window.localStorage.getItem(key);
        if (lsVal !== null) return lsVal;
      } catch {}
    }

    // 3. In-memory fallback
    return memoryStore.get(key) ?? null;
  },

  /**
   * Persists a key-value pair following strict consent and capability rules.
   * Reports the persistence outcome.
   */
  setItem(
    key: string,
    value: string,
    category: StorageCategory = "functional",
    options: StorageOptions = {}
  ): StorageResult {
    // Invariant: Never allow storing authentication tokens in client storage
    if (isAuthTokenKey(key)) {
      return {
        stored: false,
        store: "none",
        reason: "auth_token_forbidden",
      };
    }

    // Check consent for non-essential data
    if (category !== "essential") {
      const consent = getStoredCookieConsent();
      if (!consent) {
        memoryStore.set(key, value);
        return {
          stored: false,
          store: "memory",
          reason: "consent_unknown",
        };
      }
      if (!consent[category]) {
        memoryStore.set(key, value);
        return {
          stored: false,
          store: "memory",
          reason: "consent_denied",
        };
      }
    }

    // Decide preferred storage target (cookies for small preferences such as theme and consent, localStorage for others)
    const preferredStore: PreferredStore =
      options.preferredStore ??
      (key === "theme" || key === "bookgarden-theme" || key === COOKIE_CONSENT_STORAGE_KEY
        ? "cookie"
        : "localStorage");

    // Case 1: Preferred store is Cookie
    if (preferredStore === "cookie") {
      if (checkCookieCapability()) {
        const ok = setCookie(key, value, options);
        if (ok) {
          return { stored: true, store: "cookie", reason: "success" };
        }
      }

      // Cookie write failed or blocked -> Fallback to localStorage if permitted
      if (checkLocalStorageCapability()) {
        try {
          window.localStorage.setItem(key, value);
          return { stored: true, store: "localStorage", reason: "success" };
        } catch {
          // Quota or access error
        }
      }

      // Neither store succeeded
      memoryStore.set(key, value);
      return {
        stored: false,
        store: "memory",
        reason: "storage_unavailable",
      };
    }

    // Case 2: Preferred store is LocalStorage
    if (preferredStore === "localStorage") {
      if (checkLocalStorageCapability()) {
        try {
          window.localStorage.setItem(key, value);
          return { stored: true, store: "localStorage", reason: "success" };
        } catch {
          // Quota or access error
        }
      }

      // LocalStorage failed -> Check if cookie fallback is appropriate for small data
      if (value.length < 1024 && checkCookieCapability()) {
        const ok = setCookie(key, value, options);
        if (ok) {
          return { stored: true, store: "cookie", reason: "success" };
        }
      }

      // Neither store succeeded
      memoryStore.set(key, value);
      return {
        stored: false,
        store: "memory",
        reason: "storage_unavailable",
      };
    }

    memoryStore.set(key, value);
    return {
      stored: false,
      store: "memory",
      reason: "storage_unavailable",
    };
  },

  /**
   * Deletes a key from cookies, localStorage, and in-memory store.
   */
  removeItem(key: string, options: { path?: string; domain?: string } = {}): void {
    deleteCookie(key, options);
    if (checkLocalStorageCapability()) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    memoryStore.delete(key);
  },
};

/**
 * Backward-compatible wrapper exposing boolean setItem for existing consumers.
 */
export const safeStorage = {
  getItem(key: string, category?: StorageCategory): string | null {
    return privacyStorage.getItem(key, category);
  },

  setItem(
    key: string,
    value: string,
    category: StorageCategory = "functional",
    options: StorageOptions = {}
  ): boolean {
    return privacyStorage.setItem(key, value, category, options).stored;
  },

  removeItem(key: string, options?: { path?: string; domain?: string }): void {
    privacyStorage.removeItem(key, options);
  },
};
