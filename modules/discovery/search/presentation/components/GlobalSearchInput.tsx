"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Book, User, Hash, Library, Clock, TrendingUp, X } from "lucide-react";
import { Input } from "@/shared/ui/Input";
import { useRouter } from "next/navigation";
import {
  autocompleteAction,
  getRecentSearchesAction,
  getTrendingSearchesAction,
  deleteSearchHistoryItemAction,
  clearRecentSearchesAction,
} from "../actions/searchActions";
import { SearchSuggestionDto } from "../../application/dto/SearchSuggestionDto";
import Link from "next/link";
import { useDebounce } from "use-debounce";

export function GlobalSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState<SearchSuggestionDto[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchRecentAndTrending = useCallback(async () => {
    try {
      const localRecent: string[] = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("bookgarden_recent_searches") || "[]")
        : [];

      const trending = await getTrendingSearchesAction();
      setRecentSearches(localRecent);
      setTrendingSearches(trending || []);
    } catch (err) {
      console.error("Failed to fetch recent/trending searches:", err);
    }
  }, []);

  useEffect(() => {
    async function fetchSuggestions() {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await autocompleteAction(debouncedQuery);
        setSuggestions(results);
      } catch (e) {
        console.error("Autocomplete failed", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery !== undefined ? customQuery : query).trim();
    if (targetQuery) {
      if (typeof window !== "undefined") {
        try {
          const current: string[] = JSON.parse(localStorage.getItem("bookgarden_recent_searches") || "[]");
          const updated = [targetQuery, ...current.filter((q) => q.toLowerCase() !== targetQuery.toLowerCase())].slice(0, 5);
          localStorage.setItem("bookgarden_recent_searches", JSON.stringify(updated));
        } catch {
          // ignore localStorage failure
        }
      }
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(targetQuery)}`);
    }
  };

  const handleDeleteRecentItem = async (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches((prev) => {
      const next = prev.filter((q) => q !== item);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bookgarden_recent_searches", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    try {
      await deleteSearchHistoryItemAction(item);
    } catch (err) {
      console.error("Failed to delete recent search item:", err);
    }
  };

  const handleClearAllRecent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("bookgarden_recent_searches");
      } catch {}
    }
    try {
      await clearRecentSearchesAction();
    } catch (err) {
      console.error("Failed to clear recent searches:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Book":
        return <Book className="w-4 h-4" />;
      case "Author":
        return <User className="w-4 h-4" />;
      case "Genre":
        return <Hash className="w-4 h-4" />;
      case "Collection":
        return <Library className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const isShowingHistory =
    isOpen &&
    query.trim().length < 2 &&
    (recentSearches.length > 0 || trendingSearches.length > 0);

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <form onSubmit={(e) => handleSearch(e)} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="search"
          placeholder="Search books, authors, genres..."
          value={query}
          onChange={(e: any) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (query.trim().length < 2) {
              fetchRecentAndTrending();
            }
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-default)] rounded-xl shadow-xl border border-[var(--border-default)] overflow-hidden z-50">
          {suggestions.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <Link
                  key={`${suggestion.url}-${idx}`}
                  href={suggestion.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors border-b border-[var(--border-subtle)] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-tertiary)] mr-3 shrink-0">
                    {getIcon(suggestion.type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {suggestion.title}
                    </span>
                    {suggestion.subtitle && (
                      <span className="text-xs text-[var(--text-tertiary)] truncate">
                        {suggestion.type} • {suggestion.subtitle}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
                No results found for &quot;{query}&quot;
              </div>
            )
          )}

          <div className="p-2 border-t border-[var(--border-default)] bg-[var(--surface-raised)]">
            <button
              onClick={(e) => handleSearch(e)}
              className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline py-1 cursor-pointer"
            >
              See all results for &quot;{query}&quot;
            </button>
          </div>
        </div>
      )}

      {/* Recent Searches & Trending Dropdown */}
      {isShowingHistory && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-default)] rounded-xl shadow-xl border border-[var(--border-default)] overflow-hidden z-50 p-2 text-xs space-y-2">
          {recentSearches.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-400" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-[10px] text-[var(--text-tertiary)] hover:text-red-500 font-medium transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-0.5 mt-1">
                {recentSearches.map((item, index) => (
                  <div
                    key={`recent-${item}-${index}`}
                    onClick={() => {
                      setQuery(item);
                      handleSearch(undefined, item);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={13} className="text-[var(--text-tertiary)] shrink-0" />
                      <span className="font-medium truncate text-xs">{item}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecentItem(e, item)}
                      aria-label={`Remove ${item} from recent searches`}
                      className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-slate-200/50 dark:hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trendingSearches.length > 0 && (
            <div className={recentSearches.length > 0 ? "pt-2 border-t border-[var(--border-subtle)]" : ""}>
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                <TrendingUp size={11} className="text-indigo-500" />
                Trending Searches
              </div>

              <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
                {trendingSearches.map((trend, idx) => (
                  <button
                    key={`trend-${trend}-${idx}`}
                    type="button"
                    onClick={() => {
                      setQuery(trend);
                      handleSearch(undefined, trend);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
