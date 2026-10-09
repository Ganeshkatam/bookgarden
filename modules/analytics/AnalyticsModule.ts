import { IEventBus } from "@/shared/core/events/types";
import { AnalyticsEventHandlers } from "./application/event-handlers/AnalyticsEventHandlers";
import { SupabaseAnalyticsProjectionStore } from "./infrastructure/SupabaseAnalyticsProjectionStore";
import { createSupabaseServerClient } from "@/shared/core/database/server";

export class AnalyticsModule {
  static async registerEventHandlers(bus: IEventBus): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const store = new SupabaseAnalyticsProjectionStore(supabase);
    const handlers = new AnalyticsEventHandlers(store);

    bus.subscribe("reader.progress.updated", async (payload, context) => {
      await handlers.handleReaderProgressUpdated(payload, context);
    });

    bus.subscribe("reader.book.completed", async (payload, context) => {
      await handlers.handleReaderBookCompleted(payload, context);
    });

    bus.subscribe("library.book.added", async (payload, context) => {
      await handlers.handleLibraryBookAdded(payload, context);
    });

    bus.subscribe("book.rated", async (payload, context) => {
      await handlers.handleBookRated(payload, context);
    });

    bus.subscribe("book.liked", async (payload, context) => {
      await handlers.handleBookLiked(payload, context);
    });
  }
}
