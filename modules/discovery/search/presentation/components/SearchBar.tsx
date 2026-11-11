"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, Book, ArrowRight, Clock, TrendingUp } from "lucide-react";
import {
  autocompleteAction,
  getRecentSearchesAction,
  getTrendingSearchesAction,
  deleteSearchHistoryItemAction,
  clearRecentSearchesAction,
} from "../actions/searchActions";
import Link from "next/link";

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SearchBar({
  initialQuery = "",
  placeholder = "Search digital archives, books, authors...",
  className = "",
  autoFocus = false,
  size = "md",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with URL query parameter & close popup on route change
  useEffect(() => {
    setIsOpen(false);
    setIsFocused(false);
    const q = searchParams.get("q");
    if (q !== null) {
      setQuery(q);
    }
  }, [searchParams]);

  // Global hotkey: '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch recent and trending searches when focusing or query is empty
  const fetchRecentAndTrending = useCallback(async () => {
    try {
      const localRecent: string[] = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("bookgarden_recent_searches") || "[]")
        : [];

      const trending = await getTrendingSearchesAction();
      setRecentSearches(localRecent);
      setTrendingSearches(trending || []);
    } catch (err) {
      console.error("Failed to load search history and trends:", err);
    }
  }, []);

  // Debounced autocomplete fetcher - ONLY open if currently focused
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await autocompleteAction(query.trim());
        if (!isCancelled) {
          setSuggestions(results || []);
          if (isFocused) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }, 220);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, isFocused]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery !== undefined ? customQuery : query).trim();
    setIsOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();
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
      console.error("Failed to delete search history item:", err);
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
      console.error("Failed to clear search history:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        const item = suggestions[highlightedIndex];
        setIsOpen(false);
        router.push(item.url || `/search?q=${encodeURIComponent(item.title)}`);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-2xl",
    lg: "px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl",
  };

  const isShowingHistory =
    isOpen &&
    (!query || query.trim().length < 2) &&
    (recentSearches.length > 0 || trendingSearches.length > 0);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={(e) => handleSubmit(e)} className="relative w-full">
        <div
          className={`w-full relative flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-xs ${sizeClasses[size]}`}
        >
          {isLoading ? (
            <Loader2
              size={size === "lg" ? 20 : 16}
              className="text-indigo-500 animate-spin mr-2.5 shrink-0"
            />
          ) : (
            <Search
              size={size === "lg" ? 20 : 16}
              className="text-slate-400 mr-2.5 shrink-0"
            />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              setIsFocused(true);
              setIsOpen(true);
              if (!query || query.trim().length < 2) {
                fetchRecentAndTrending();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ring-0 w-full min-w-0 font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-none appearance-none p-0"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
                setIsFocused(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search input"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors mr-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="submit"
            aria-label="Submit search"
            className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowRight size={13} />
          </button>
        </div>
      </form>

      {/* Autocomplete Suggestions Popup */}
      {isOpen && isFocused && query.trim().length >= 2 && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 p-1.5 text-xs">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Catalogue Suggestions</span>
            <span>Jump to volume</span>
          </div>

          <div className="space-y-0.5">
            {suggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;

              return (
                <Link
                  key={`${item.title}-${index}`}
                  href={item.url || `/search?q=${encodeURIComponent(item.title)}`}
                  onClick={() => {
                    setIsOpen(false);
                    setIsFocused(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${isHighlighted
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200"
                      : "text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Book size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate leading-snug">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          by {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    size={13}
                    className="text-slate-400 dark:text-slate-600 shrink-0"
                  />
                </Link>
              );
            })}
          </div>

          <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Press Enter to search all results</span>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              See all &ldquo;{query}&rdquo;
            </button>
          </div>
        </div>
      )}

      {/* Recent Searches & Trending Searches Popup */}
      {isShowingHistory && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 p-2 text-xs space-y-2">
          {recentSearches.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-400" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors cursor-pointer"
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
                      handleSubmit(undefined, item);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="font-medium truncate text-xs">{item}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecentItem(e, item)}
                      aria-label={`Remove ${item} from search history`}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trendingSearches.length > 0 && (
            <div className={recentSearches.length > 0 ? "pt-2 border-t border-slate-100 dark:border-slate-800" : ""}>
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
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
                      handleSubmit(undefined, trend);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
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

export default SearchBar;
