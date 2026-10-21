import { eventBus } from "@/shared/core/events/EventBus";
import { IEventBus } from "@/shared/core/events/types";
import { createSupabaseServerClient } from "@/shared/core/database/server";

/**
 * Event Handlers for Discovery Recommendation Signals
 *
 * Listens to domain events from other bounded contexts (Library, Reader, etc.)
 * and incrementally updates the read models in the Discovery context.
 */
export function registerRecommendationSignalHandlers(bus: IEventBus = eventBus) {
  bus.subscribe("reader.page.completed", async (event: any) => {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("refresh_recommendation_signals", {
        target_user_id: event.userId,
      });
      if (error) {
        throw error;
      }
    } catch (e) {
      console.error(
        "Failed to update recommendation signals on page completion",
        e,
      );
      throw e;
    }
  });

  bus.subscribe("book.liked", async (event: any) => {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("refresh_recommendation_signals", {
        target_user_id: event.userId,
      });
      if (error) {
        throw error;
      }
    } catch (e) {
      console.error("Failed to update recommendation signals on book like", e);
      throw e;
    }
  });

  bus.subscribe("book.rated", async (event: any) => {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("refresh_recommendation_signals", {
        target_user_id: event.userId,
      });
      if (error) {
        throw error;
      }
    } catch (e) {
      console.error("Failed to update recommendation signals on book rate", e);
      throw e;
    }
  });
}
