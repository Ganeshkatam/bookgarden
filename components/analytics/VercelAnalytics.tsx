"use client";

import React from "react";
import { Analytics } from "@vercel/analytics/next";
import { isStorageAllowed } from "@/shared/core/storage/privacy-storage";

export interface VercelAnalyticsProps {
  debug?: boolean;
}

/**
 * Vercel Analytics Component with Privacy-Storage Consent Guard.
 *
 * Honors the platform's cookie-first, consent-aware architecture:
 * If the user has not granted consent for the "analytics" category,
 * or has explicitly rejected optional cookies, beforeSend drops all telemetry events.
 */
export function VercelAnalytics({ debug }: VercelAnalyticsProps) {
  return (
    <Analytics
      debug={debug}
      beforeSend={(event) => {
        try {
          if (!isStorageAllowed("analytics")) {
            return null;
          }
        } catch {
          // Fail-safe: if privacy storage check throws, fail closed
          return null;
        }
        return event;
      }}
    />
  );
}

export default VercelAnalytics;
