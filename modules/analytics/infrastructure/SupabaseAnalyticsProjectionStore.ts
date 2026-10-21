import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";

export interface AnalyticsProjectionStore {
  recordPagesRead(
    userId: string,
    bookId: string,
    pagesDelta: number,
    dateStr: string,
    eventId?: string,
  ): Promise<void>;
  recordBookCompleted(
    userId: string,
    bookId: string,
    dateStr: string,
    eventId?: string,
  ): Promise<void>;
  recordBookStarted(
    userId: string,
    bookId: string,
    dateStr: string,
    eventId?: string,
  ): Promise<void>;
  updateBookRating(
    userId: string,
    bookId: string,
    rating: number,
    eventId?: string,
  ): Promise<void>;
  recordBookLiked(
    userId: string,
    bookId: string,
    eventId?: string,
  ): Promise<void>;
}

export class SupabaseAnalyticsProjectionStore implements AnalyticsProjectionStore {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private async getBookGenre(bookId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("books")
      .select("book_genres(genres(name))")
      .eq("id", bookId)
      .single();
    return (data as any)?.book_genres?.[0]?.genres?.name || null;
  }

  private async invokeRpc(name: string, params: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.rpc(name as any, params);
    if (error) {
      console.error(`[SupabaseAnalyticsProjectionStore] RPC ${name} failed:`, error);
      throw error;
    }
  }

  async recordPagesRead(
    userId: string,
    bookId: string,
    pagesDelta: number,
    dateStr: string,
    eventId?: string,
  ): Promise<void> {
    if (pagesDelta <= 0) return;

    const monthStr = dateStr.substring(0, 7);
    const genre = await this.getBookGenre(bookId);

    if (eventId) {
      await this.invokeRpc("record_analytics_pages_read_idempotent", {
        p_event_id: eventId,
        p_user_id: userId,
        p_book_id: bookId,
        p_pages: pagesDelta,
        p_date: dateStr,
        p_month: monthStr,
        p_genre: genre,
      });
      return;
    }

    // Daily
    await this.invokeRpc("increment_analytics_daily_pages", {
      p_user_id: userId,
      p_date: dateStr,
      p_pages: pagesDelta,
    });

    // Monthly
    await this.invokeRpc("increment_analytics_monthly_pages", {
      p_user_id: userId,
      p_month: monthStr,
      p_pages: pagesDelta,
    });

    // Genre
    if (genre) {
      await this.invokeRpc("increment_analytics_genre_pages", {
        p_user_id: userId,
        p_genre: genre,
        p_pages: pagesDelta,
      });
    }

    // Book Stats
    await this.invokeRpc("increment_analytics_book_pages", {
      p_book_id: bookId,
      p_pages: pagesDelta,
    });
  }

  async recordBookCompleted(
    userId: string,
    bookId: string,
    dateStr: string,
    eventId?: string,
  ): Promise<void> {
    const monthStr = dateStr.substring(0, 7);
    const genre = await this.getBookGenre(bookId);

    if (eventId) {
      await this.invokeRpc("record_analytics_book_completed_idempotent", {
        p_event_id: eventId,
        p_user_id: userId,
        p_book_id: bookId,
        p_date: dateStr,
        p_month: monthStr,
        p_genre: genre,
      });
      return;
    }

    // Daily
    await this.invokeRpc("increment_analytics_daily_completed", {
      p_user_id: userId,
      p_date: dateStr,
    });

    // Monthly
    await this.invokeRpc("increment_analytics_monthly_completed", {
      p_user_id: userId,
      p_month: monthStr,
    });

    // Genre
    if (genre) {
      await this.invokeRpc("increment_analytics_genre_completed", {
        p_user_id: userId,
        p_genre: genre,
      });
    }

    // Book Stats
    await this.invokeRpc("increment_analytics_book_completed", {
      p_book_id: bookId,
    });
  }

  async recordBookStarted(
    userId: string,
    bookId: string,
    dateStr: string,
  ): Promise<void> {
    const genre = await this.getBookGenre(bookId);

    // Genre
    if (genre) {
      await this.invokeRpc("increment_analytics_genre_started", {
        p_user_id: userId,
        p_genre: genre,
      });
    }

    // Book Stats (Reads count)
    await this.invokeRpc("increment_analytics_book_reads", {
      p_book_id: bookId,
    });
  }

  async updateBookRating(
    userId: string,
    bookId: string,
    rating: number,
  ): Promise<void> {
    const genre = await this.getBookGenre(bookId);

    // Genre
    if (genre) {
      await this.invokeRpc("increment_analytics_genre_rating", {
        p_user_id: userId,
        p_genre: genre,
      });
    }

    await this.invokeRpc("recalculate_analytics_book_rating", {
      p_book_id: bookId,
    });
  }

  async recordBookLiked(userId: string, bookId: string): Promise<void> {
    const genre = await this.getBookGenre(bookId);

    if (genre) {
      await this.invokeRpc("increment_analytics_genre_likes", {
        p_user_id: userId,
        p_genre: genre,
      });
    }
  }
}
