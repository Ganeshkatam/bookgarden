"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookSummaryDto } from "../../application/dto/BookSummaryDto";
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import DefaultBookCover from "@/modules/books/components/DefaultBookCover";
import { addBookToLibraryAction } from "../actions/discovery";
import { generateSimpleDescription } from "@/modules/storage/services/pdf-description-generator";

interface FeaturedBooksProps {
  items: readonly Partial<BookSummaryDto>[];
}

export function FeaturedBooks({ items }: FeaturedBooksProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showShelfMenu, setShowShelfMenu] = useState(false);
  const [shelfSuccess, setShelfSuccess] = useState<string | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});

  const validItems = useMemo(() => {
    return (items || []).filter(
      (item): item is BookSummaryDto => Boolean(item && item.id && item.title),
    );
  }, [items]);

  // Auto-rotate featured selection every 8 seconds when not hovered or interacting
  useEffect(() => {
    if (validItems.length <= 1 || isPaused || showShelfMenu) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % validItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [validItems.length, isPaused, showShelfMenu]);

  const primary = validItems.length > 0 ? validItems[selectedIndex % validItems.length] : null;
  const primaryAuthors =
    primary?.authors && primary.authors.length > 0
      ? primary.authors.map((a) => a.name).join(", ")
      : "BookGarden Library";

  const primaryLanguage = (primary?.language || "English").toUpperCase();
  const primaryYear = primary?.publicationYear || null;
  const primaryGenre =
    (primary?.genres && primary.genres.length > 0
      ? typeof primary.genres[0] === "string"
        ? primary.genres[0]
        : (primary.genres[0] as any)?.name
      : null) || "Literature";

  const description = useMemo(() => {
    if (!primary) return "";
    return generateSimpleDescription(primary.title, primaryAuthors);
  }, [primary, primaryAuthors]);

  const prevSlide = () => {
    setSelectedIndex(
      (prev) => (prev - 1 + validItems.length) % validItems.length,
    );
  };

  const nextSlide = () => {
    setSelectedIndex((prev) => (prev + 1) % validItems.length);
  };

  const handleAddToShelf = async (
    status: "want_to_read" | "currently_reading" | "finished",
  ) => {
    if (!primary) return;
    try {
      await addBookToLibraryAction(primary.id, status);
      setShelfSuccess(status);
      setShowShelfMenu(false);
      setTimeout(() => setShelfSuccess(null), 3000);
    } catch (error) {
      console.error("Failed to add featured book to shelf:", error);
    }
  };

  // Pick up to 3 secondary items from the remaining books
  const secondaryItems = useMemo(() => {
    return validItems
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(
        ({ originalIndex }) =>
          originalIndex !== selectedIndex % validItems.length,
      )
      .slice(0, 3);
  }, [validItems, selectedIndex]);

  if (!primary || validItems.length === 0) return null;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch w-full min-w-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Primary Spotlight Banner */}
      <div className={`${secondaryItems.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white border border-indigo-800/30 shadow-xl relative overflow-hidden group transition-all duration-500 min-h-[360px]`}>
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center">
          {/* Cover */}
          <div className="relative w-36 sm:w-44 md:w-52 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-300">
            {primary.coverUrl && !failedCoverIds[primary.id] ? (
              <Image
                src={primary.coverUrl.replace(/ /g, "%20")}
                alt={primary.title}
                fill
                className="object-cover transition-opacity duration-500"
                sizes="(max-width: 640px) 144px, 208px"
                priority
                onError={() => setFailedCoverIds((prev) => ({ ...prev, [primary.id]: true }))}
              />
            ) : (
              <DefaultBookCover
                title={primary.title}
                authors={primaryAuthors}
              />
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 flex flex-col justify-between space-y-4 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-extrabold uppercase tracking-wider">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Featured Selection</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-indigo-200 text-[11px] font-semibold">
                  {primaryGenre}
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-snug line-clamp-2 transition-all duration-300">
                {primary.title}
              </h3>

              <p className="text-xs sm:text-sm text-indigo-200 font-medium line-clamp-1">
                by <span className="text-white font-bold">{primaryAuthors}</span>
              </p>

              <div className="flex items-center gap-2 text-xs text-indigo-300/80 pt-0.5 font-semibold">
                {primaryYear && (
                  <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white font-mono text-[11px]">
                    {primaryYear}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 font-mono text-[11px]">
                  {primaryLanguage}
                </span>
              </div>

              {/* Synopsis excerpt */}
              <p className="text-xs text-slate-300/90 font-sans line-clamp-2 pt-1 leading-relaxed max-w-xl">
                {description}
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap relative">
              <Link
                href={`/read/${primary.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <BookOpen size={15} />
                <span>Start Reading</span>
              </Link>

              <Link
                href={`/book/${primary.slug || primary.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all border border-white/10 cursor-pointer"
              >
                <span>Book Details</span>
                <ChevronRight size={14} />
              </Link>

              {/* Add to Shelf Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowShelfMenu(!showShelfMenu)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all border border-white/10 cursor-pointer"
                  title="Add to Library Shelf"
                >
                  {shelfSuccess ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-300">Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      <span>Save</span>
                    </>
                  )}
                </button>

                {showShelfMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleAddToShelf("want_to_read")}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Bookmark size={13} className="text-amber-500" />
                      <span>Want to Read</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToShelf("currently_reading")}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Clock size={13} className="text-indigo-500" />
                      <span>Currently Reading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToShelf("finished")}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Check size={13} className="text-emerald-500" />
                      <span>Finished</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Slide Navigation Arrows & Indicator Dots */}
        {validItems.length > 1 && (
          <div className="relative z-10 flex items-center justify-between pt-5 mt-4 border-t border-white/10">
            {/* Slide Dots / Counter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-indigo-300">
                {String((selectedIndex % validItems.length) + 1).padStart(
                  2,
                  "0",
                )}{" "}
                / {String(validItems.length).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1 ml-2">
                {validItems.map((_, idx) => (
                  <button
                    key={`spotlight-dot-${idx}`}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    aria-label={`Jump to featured title ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === selectedIndex % validItems.length
                      ? "w-6 bg-indigo-500"
                      : "w-1.5 bg-white/20 hover:bg-white/40"
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Next / Prev Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous featured title"
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next featured title"
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Featured List */}
      {secondaryItems.length > 0 && (
        <div className="lg:col-span-4 flex flex-col h-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-display font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Also Hand-Picked
              </h4>
              <span className="text-[11px] font-bold text-slate-400">
                {secondaryItems.length} Titles
              </span>
            </div>

            <div className="space-y-2.5">
              {secondaryItems.map(({ item: book, originalIndex }) => {
                const author =
                  book.authors && book.authors.length > 0
                    ? book.authors.map((a) => a.name).join(", ")
                    : "BookGarden Library";

                const year = book.publicationYear || null;

                return (
                  <div
                    key={book.id}
                    onClick={() => setSelectedIndex(originalIndex)}
                    className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 border border-transparent hover:border-indigo-200 dark:hover:border-slate-700/80 transition-all group cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedIndex(originalIndex);
                      }
                    }}
                  >
                    <div className="relative w-12 sm:w-14 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-xs border border-slate-200/60 dark:border-slate-800 group-hover:scale-105 transition-transform">
                      {book.coverUrl && !failedCoverIds[book.id] ? (
                        <Image
                          src={book.coverUrl.replace(/ /g, "%20")}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                          onError={() => setFailedCoverIds((prev) => ({ ...prev, [book.id]: true }))}
                        />
                      ) : (
                        <DefaultBookCover
                          title={book.title}
                          authors={author}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {book.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                        by {author}
                      </p>
                      {year && (
                        <span className="inline-block mt-0.5 text-[10px] font-mono font-semibold text-slate-400">
                          {year}
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      size={14}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/discover/featured"
            className="inline-flex items-center justify-center gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>View All Curated Collections</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default FeaturedBooks;
