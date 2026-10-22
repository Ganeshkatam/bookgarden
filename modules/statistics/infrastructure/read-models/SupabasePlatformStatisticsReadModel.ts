import { SupabaseClient } from "@supabase/supabase-js";
import { PlatformStatisticsReadModel } from "../../application/ports/read-models/PlatformStatisticsReadModel";
import { PlatformStatisticsDto } from "../../application/queries/GetPlatformStatistics/read-model";

export class SupabasePlatformStatisticsReadModel implements PlatformStatisticsReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  async getStatistics(): Promise<PlatformStatisticsDto> {
    const [booksRes, authorsRes, genresRes] = await Promise.all([
      this.supabase
        .from("books")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("is_archived", false),
      this.supabase.from("authors").select("*", { count: "exact", head: true }),
      this.supabase.from("genres").select("*", { count: "exact", head: true }),
    ]);

    return {
      booksCount: booksRes.count ?? 0,
      authorsCount: authorsRes.count ?? 0,
      genresCount: genresRes.count ?? 0,
    };
  }
}
