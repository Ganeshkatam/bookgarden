import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";
import { SearchRequest } from "../../application/dto/SearchRequestDto";
import {
  SearchResponse,
  SearchResult,
} from "../../application/dto/SearchResultDto";
import { SearchFacetDto } from "../../application/dto/SearchFacetDto";
import { unstable_cache } from "next/cache";

export class SupabaseSearchReadModel {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, filters, page, pageSize, sort, includeUnavailable } =
      request;

    // Execute search and facet aggregation in parallel
    const [searchResult, facetsResult] = await Promise.all([
      this.supabase.rpc("execute_book_search_v1", {
        p_query: query || "",
        p_page: page,
        p_page_size: pageSize,
        p_sort: sort,
        p_genres: filters?.genres || [],
        p_subjects: filters?.subjects || [],
        p_languages: filters?.language || [],
        p_publication_years: filters?.publicationYear || [],
        p_include_unavailable: includeUnavailable || false,
      }),
      this.supabase.rpc("get_search_facets_v1", {
        p_query: query || "",
        p_genres: filters?.genres || [],
        p_subjects: filters?.subjects || [],
        p_languages: filters?.language || [],
        p_publication_years: filters?.publicationYear || [],
        p_include_unavailable: includeUnavailable || false,
      }),
    ]);

    if (searchResult.error) {
      console.error(
        "[SearchReadModel] Search RPC Error:",
        searchResult.error.message || searchResult.error,
        searchResult.error.details || "",
        searchResult.error.hint || "",
        searchResult.error.code || "",
      );
      return {
        results: [],
        totalCount: 0,
        totalPages: 0,
        facets: [],
        page: request.page,
        pageSize: request.pageSize,
        executionTimeMs: Date.now() - startTime,
        isTypoFallback: false,
      };
    }

    const rows = searchResult.data || [];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const isTypoFallback =
      rows.length > 0 ? Boolean(rows[0].is_typo_fallback) : false;
    const suggestedQuery =
      rows.length > 0 ? rows[0].suggested_query || undefined : undefined;

    const results: SearchResult[] = rows.map((row: any) => ({
      id: row.book_id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle || undefined,
      authors: row.authors || [],
      genres: row.genres || [],
      subjects: row.subjects || [],
      language: row.language,
      coverUrl: row.cover_url ? row.cover_url.replace(/ /g, "%20") : null,
      publicationYear: row.publication_year || null,
      averageRating: row.average_rating || 0,
      ratingCount: row.rating_count || 0,
      popularityScore: row.popularity_score || 0,
      relevanceScore: row.relevance_score || 0,
    }));

    // Group the relational facet rows back into the DTO hierarchy
    const facetRows = facetsResult.data || [];
    const facetsByKey = new Map<string, SearchFacetDto>();

    for (const row of facetRows) {
      const key = row.facet_key;
      if (!facetsByKey.has(key)) {
        facetsByKey.set(key, {
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          type: key,
          values: [],
        });
      }

      const facet = facetsByKey.get(key)!;
      facet.values.push({
        value: row.facet_value,
        label: row.facet_value,
        count: Number(row.match_count),
        selected: (filters?.[key as keyof typeof filters] || [])
          .map(String)
          .includes(row.facet_value),
      });
    }

    // Sort facet values by count desc
    const facets = Array.from(facetsByKey.values()).map((f) => {
      f.values.sort((a, b) => b.count - a.count);
      return f;
    });

    return {
      results,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      facets,
      page,
      pageSize,
      executionTimeMs: Date.now() - startTime,
      isTypoFallback,
      suggestedQuery,
    };
  }

  async autocomplete(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];

    const { data, error } = await this.supabase.rpc(
      "get_search_autocomplete_v1",
      {
        p_query: query,
      },
    );

    if (error) throw new Error(`Autocomplete failed: ${error.message}`);

    return (data || []).map((row) => ({
      type: "Book",
      title: row.title,
      subtitle: row.author, // The RPC returns a single author
      url: `/book/${row.slug || row.book_id}`,
      // We pass the reason internally for debugging/telemetry
      _reason: row.reason,
    }));
  }

  async getRecentSearches(_userId: string): Promise<string[]> {
    // Database search history is retired. Returns empty list (handled client-side via localStorage).
    return [];
  }

  async getTrendingSearches(): Promise<string[]> {
    // Cache trending searches for 1 hour to prevent constant DB hits
    const getCachedTrending = unstable_cache(
      async () => {
        try {
          const { data, error } = await this.supabase
            .from("trending_books_projection")
            .select("book:books(title)")
            .order("weekly_score", { ascending: false })
            .limit(5);

          if (error || !data) {
            return [];
          }

          return data
            .map((r: any) => r.book?.title)
            .filter((title: string | undefined): title is string => Boolean(title));
        } catch (err) {
          console.error(
            "[SearchReadModel] Failed to fetch trending searches",
            err,
          );
          return [];
        }
      },
      ["trending-searches"],
      { revalidate: 3600 }, // 1 hour
    );

    return getCachedTrending();
  }
}
