"use server";

import { createSupabaseServerClient } from "@/shared/core/database/server";
import { BookDto } from "@/modules/library/application/dto/response/BookDto";
import { BookMapper } from "@/modules/library/application/mappers/BookMapper";

import { ServerActionResult } from "@/lib/actions/action-result";

const PAGE_SIZE = 20;

export async function searchBooks(
  query: string,
  genre: string,
  page: number = 1,
): Promise<
  ServerActionResult<{
    books: BookDto[];
    count: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>
> {
  try {
    const supabase = await createSupabaseServerClient();

    const sanitizedQuery = query.replace(/[\\\\'\";<>]/g, "").trim();
    const sanitizedGenre = genre.replace(/[\\\\'\";<>]/g, "").trim();
    const primaryGenre = sanitizedGenre.split(",")[0]?.trim() || "";

    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(PAGE_SIZE, 100));

    const { data, error } = await supabase.rpc("execute_book_search_v1", {
      p_query: sanitizedQuery,
      p_genres: primaryGenre ? [primaryGenre] : [],
      p_page: safePage,
      p_page_size: safePageSize,
      p_include_unavailable: false,
      p_languages: [],
      p_publication_years: [],
      p_sort: "relevance",
      p_subjects: []
    });

    if (error) {
      console.error("FTS search error:", error.message);
      return { success: false, error: { message: error.message } };
    }

    // execute_book_search_v1 returns a different shape (e.g. book_id instead of id). 
    // We map the returned fields to BookDto properties.
    const books: BookDto[] = (data || []).map((row: any) => {
      // Create an object that matches the BookDto schema expected by the UI.
      const bookData = {
        id: row.book_id,
        title: row.title,
        subtitle: row.subtitle,
        authors: row.authors || [],
        cover_url: null, // Discovery projection currently doesn't store cover, might need fallback
        release_date: null,
        description: null,
        rating: row.average_rating,
        ...row,
      };
      return BookMapper.toDto(bookData);
    });

    const totalCount = data?.[0]?.total_count || 0;

    return {
      success: true,
      data: {
        books,
        count: Number(totalCount),
        page: safePage,
        pageSize: safePageSize,
        hasMore: safePage * safePageSize < Number(totalCount),

      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Search failed",
      },
    };
  }
}
