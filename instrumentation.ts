/**
 * NEXT.JS INSTRUMENTATION
 *
 * This file runs exactly once when the Next.js server boots up.
 * It is the correct, architecturally sound place to initialize
 * server-side singletons like our Event Bus listeners or APM agents.
 */

import { eventBus } from "./shared/core/events/EventBus";
import { supabase } from "./shared/core/database/client";
import { SearchAnalyticsHandler } from "./modules/discovery/search/application/event-handlers/SearchAnalyticsHandler";
import { initializeSearchEventHandlers } from "./modules/discovery/search/application/event-handlers";
import { getAuthRateLimitConfig } from "./modules/authentication/services/auth-rate-limit-config";

export async function register() {
  // Only boot on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail-fast startup validation for authentication rate-limiting configuration
    getAuthRateLimitConfig();

    console.log("[Platform] Booting Subsystem Event Listeners...");

    const analyticsHandler = new SearchAnalyticsHandler(supabase);
    initializeSearchEventHandlers(eventBus, analyticsHandler);

    // Future listeners go here:
    // initializeNotificationListeners();
    // initializeRecommendationEngineListeners();
  }
}
