"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BookDto } from "@/modules/library/application/dto/response/BookDto";
import BookCard from "@/modules/books/components/BookCard";
import { FadeIn, StaggerContainer, StaggerItem } from "@/shared/ui/animations";
import {
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import VoiceInput from "@/modules/discovery/search/presentation/components/VoiceInput";
import { searchBooks } from "@/modules/discovery/search/presentation/actions/search";
import { safeStorage } from "@/shared/core/storage/privacy-storage";

// ─── Constants ───────────────────────────────────────────────
const RECENT_SEARCHES_KEY = process.env.NEXT_PUBLIC_RECENT_SEARCHES_KEY!;
const MAX_RECENT = parseInt(process.env.NEXT_PUBLIC_MAX_RECENT_SEARCHES!, 10);

// ─── Helpers ─────────────────────────────────────────────────
function getRecentSearches(): string[] {
  try {
    const raw = safeStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const recent = getRecentSearches().filter(
      (s) => s.toLowerCase() !== query.toLowerCase(),
    );
    recent.unshift(query.trim());
    safeStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
      "functional"
    );
  } catch {
    /* storage unavailable */
  }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-primary/30 text-white rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// ─── Types ───────────────────────────────────────────────────
interface SearchClientProps {
  initialBooks: BookDto[];
  initialCount: number;
  initialQuery: string;
  initialGenre: string;
  initialPage: number;
  hasMore: boolean;
}

// ─── Component ───────────────────────────────────────────────
export default function SearchClient({
  initialBooks,
  initialCount,
  initialQuery,
  initialGenre,
  initialPage,
  hasMore: initialHasMore,
}: SearchClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState<BookDto[]>(initialBooks);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    // Save current query as recent
    if (initialQuery.trim()) {
      saveRecentSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = useCallback(
    (newQuery: string) => {
      const params = new URLSearchParams();
      if (newQuery.trim()) params.set("q", newQuery.trim());
      if (initialGenre) params.set("genre", initialGenre);
      saveRecentSearch(newQuery);
      router.push(`/discover/search?${params.toString()}`);
    },
    [initialGenre, router],
  );

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await searchBooks(initialQuery, initialGenre, nextPage);
      if (result.success) {
        setBooks((prev) => [...prev, ...result.data.books]);
        setPage(nextPage);
        setHasMore(result.data.hasMore);
        setTotalCount(result.data.count);
      } else {
        console.error("Failed to load more:", result.error.message);
      }
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearRecentSearches = () => {
    safeStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] font-sans selection:bg-indigo-500/30">
      <div className="pt-8 pb-12 w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <FadeIn className="mb-10">
          <div className="max-w-4xl mx-auto">
            <div className="relative group z-30">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500" />
              <div className="relative flex items-center bg-[var(--surface-default)] border border-[var(--border-default)] rounded-xl shadow-2xl">
                <div className="pl-4 text-slate-400">
                  <SearchIcon size={20} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowRecent(true)}
                  onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch(query);
                  }}
                  placeholder="Search titles, authors, genres..."
                  className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 focus:outline-none text-lg placeholder:text-slate-500"
                />
                <div className="flex items-center gap-2 mr-2">
                  {query && (
                    <button
                      onClick={() => {
                        setQuery("");
                        handleSearch("");
                      }}
                      className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <VoiceInput
                    onTranscript={(text) => {
                      setQuery(text);
                      handleSearch(text);
                    }}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleSearch(query)}
                  className="mr-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all"
                >
                  Search
                </button>
              </div>

              {/* Recent Searches Dropdown */}
              {showRecent && !query && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-default)] backdrop-blur-xl border border-[var(--border-default)] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={clearRecentSearches}
                      className="text-xs text-slate-500 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="pb-2">
                    {recentSearches.map((term, idx) => (
                      <li key={idx}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setQuery(term);
                            handleSearch(term);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left transition-colors text-sm text-slate-300 hover:text-white"
                        >
                          <Clock size={14} className="text-slate-500" />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[var(--border-subtle)] pb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>
              {books.length > 0 ? (
                <>
                  Found <span className="text-primary">{totalCount}</span>{" "}
                  results
                  {(initialQuery || initialGenre) && (
                    <span className="text-slate-400 text-lg font-normal ml-2">
                      for &quot;{initialQuery || initialGenre}&quot;
                    </span>
                  )}
                </>
              ) : initialQuery ? (
                "No results found"
              ) : (
                <>
                  Showing <span className="text-primary">{totalCount}</span>{" "}
                  books
                </>
              )}
            </span>
          </h1>
          {totalCount > 0 && (
            <span className="text-sm text-slate-500">
              Showing {books.length} of {totalCount}
            </span>
          )}
        </div>

        {/* Results Grid */}
        {books.length === 0 ? (
          <FadeIn>
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-[var(--border-subtle)]">
              <div className="text-6xl mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {initialQuery ? (
                  <>
                    No books matching &quot;
                    {highlightMatch(initialQuery, initialQuery)}&quot;
                  </>
                ) : (
                  "Start searching"
                )}
              </h3>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                {initialQuery
                  ? "Try different keywords, check for typos, or broaden your search."
                  : "Type a title, author, or genre to discover books."}
              </p>
              {initialQuery && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleSearch("")}
                    className="text-primary hover:text-primary-light font-medium transition-colors"
                  >
                    Browse All Books
                  </button>
                  {recentSearches.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Try a recent search
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {recentSearches
                          .filter((s) => s !== initialQuery)
                          .slice(0, 3)
                          .map((term, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSearch(term)}
                              className="px-4 py-2 rounded-full bg-white/5 border border-[var(--border-default)] text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {term}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FadeIn>
        ) : (
          <>
            {/* Top Results callout for first page */}
            {initialQuery && page === 1 && books.length > 0 && (
              <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp size={14} className="text-primary" />
                <span>Top results ranked by relevance</span>
              </div>
            )}

            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {books.map((book) => (
                <StaggerItem key={book.id}>
                  <BookCard book={book} onAddToList={() => {}} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Load More */}
            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>Load More Books</>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  Page {page} · {books.length} of {totalCount} results
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
