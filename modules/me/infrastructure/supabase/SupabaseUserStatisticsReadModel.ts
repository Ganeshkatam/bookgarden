import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";
import {
  GetUserStatisticsQuery,
  UserStatisticsDto,
} from "../../application/queries/GetUserStatisticsQuery";

export class SupabaseUserStatisticsReadModel implements GetUserStatisticsQuery {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async execute(userId: string): Promise<UserStatisticsDto | null> {
    const { data, error } = await this.supabase
      .from("user_statistics")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Failed to fetch user statistics", error);
      return null;
    }

    const secondsRead = data.seconds_read || 0;

    return {
      booksCompleted: data.books_completed || 0,
      pagesRead: data.pages_read || 0,
      secondsRead: secondsRead,
      minutesRead: Math.floor(secondsRead / 60),
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
    };
  }
}
