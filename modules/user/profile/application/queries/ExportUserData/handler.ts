import { SupabaseClient } from "@supabase/supabase-js";
import { ExportUserDataQuery } from "./ExportUserDataQuery";
import { Database } from "@/shared/core/types/database";

export class ExportUserDataHandler {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async execute(query: ExportUserDataQuery): Promise<any> {
    const userId = query.userId;

    const [
      profileResult,
      libraryResult,
      collectionsResult,
      bookmarksResult,
      highlightsResult,
      annotationsResult,
      sessionsResult,
      positionsResult,
    ] = await Promise.all([
      this.supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      this.supabase.from("library_books").select("*").eq("user_id", userId),
      this.supabase
        .from("shelves")
        .select("*, shelf_items(*)")
        .eq("user_id", userId),
      this.supabase.from("bookmarks").select("*").eq("user_id", userId),
      this.supabase.from("highlights").select("*").eq("user_id", userId),
      this.supabase.from("annotations").select("*").eq("user_id", userId),
      this.supabase.from("reading_sessions").select("*").eq("user_id", userId),
      this.supabase.from("reading_progress").select("*").eq("user_id", userId),
    ]);

    return {
      export_date: new Date().toISOString(),
      user_id: userId,
      profile: profileResult || {},
      library_books: libraryResult || [],
      collections: collectionsResult || [],
      bookmarks: bookmarksResult || [],
      highlights: highlightsResult || [],
      annotations: annotationsResult || [],
      reading_sessions: sessionsResult || [],
      reading_positions: positionsResult || [],
    };
  }
}
