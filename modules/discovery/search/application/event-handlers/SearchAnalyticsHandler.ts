import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";

export class SearchAnalyticsHandler {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async handle(payload: {
    searchId: string;
    userId?: string;
    query: string;
    executionTimeMs: number;
    resultCount: number;
    filters: any;
    sort: string;
    timestamp: string;
  }): Promise<void> {
    try {
      // 1. Slow Query Telemetry (Adjusted for network latency)
      if (payload.executionTimeMs > 2500) {
        console.error(
          `[SearchAnalytics] CRITICAL: Slow query detected (${payload.executionTimeMs}ms) for query: "${payload.query}"`,
        );
      } else if (payload.executionTimeMs > 1000) {
        console.warn(
          `[SearchAnalytics] WARNING: Sub-optimal query detected (${payload.executionTimeMs}ms) for query: "${payload.query}"`,
        );
      }

      // Note: Search history database storage is retired per ADR-002.
      // Search telemetry is handled purely in-memory / observability logs.
    } catch (err) {
      console.error("[SearchAnalyticsHandler] Unexpected error:", err);
    }
  }
}
