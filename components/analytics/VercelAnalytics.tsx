"use client";

import React, { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import {
  isStorageAllowed,
  CookiePreferences,
} from "@/shared/core/storage/privacy-storage";

export interface VercelAnalyticsProps {
  debug?: boolean;
}

/**
 * Removes injected Vercel Analytics script element from document head upon consent revocation.
 */
function removeVercelAnalyticsScript(): void {
  if (typeof document === "undefined") return;
  try {
    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[src*="insights/script"], script[src*="script.debug.js"]',
    );
    scripts.forEach((script) => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
  } catch {
    // Non-fatal cleanup safety
  }
}

/**
 * Vercel Analytics Component with Dynamic Privacy-Storage Consent Guard.
 *
 * Implements strict consent-aware lifecycle management:
 * 1. Initial Gate: Does NOT mount or inject Vercel Analytics scripts if consent
 *    is absent, unreadable, or denied (zero pre-consent network requests).
 * 2. Dynamic Update: Listens to "cookie-consent-updated" events to mount immediately
 *    when consent is granted, without requiring a page reload.
 * 3. Immediate Revocation: When consent is withdrawn, unmounts the component and
 *    purges any injected script elements from document.head.
 * 4. Defense-in-Depth: Enforces a beforeSend hook verifying isStorageAllowed("analytics").
 */
export function VercelAnalytics({ debug }: VercelAnalyticsProps) {
  const [mounted, setMounted] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialAllowed = isStorageAllowed("analytics");
    setHasConsent(initialAllowed);

    if (!initialAllowed) {
      removeVercelAnalyticsScript();
    }

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferences | null>;
      const detail = customEvent.detail;

      if (!detail) {
        setHasConsent(false);
        removeVercelAnalyticsScript();
      } else {
        const allowed = Boolean(detail.analytics);
        setHasConsent(allowed);
        if (!allowed) {
          removeVercelAnalyticsScript();
        }
      }
    };

    window.addEventListener("cookie-consent-updated", handleConsentChange);
    return () => {
      window.removeEventListener("cookie-consent-updated", handleConsentChange);
    };
  }, []);

  // Do not render or inject tracking script until mounted and consent is explicitly granted
  if (!mounted || !hasConsent) {
    return null;
  }

  return (
    <Analytics
      debug={debug}
      beforeSend={(event) => {
        try {
          if (!isStorageAllowed("analytics")) {
            return null;
          }
        } catch {
          // Fail-safe: drop event on storage check failure
          return null;
        }
        return event;
      }}
    />
  );
}

export default VercelAnalytics;
