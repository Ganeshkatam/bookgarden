"use client";

import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Bookmark,
  Check,
  Share2,
  BookOpen,
  Sparkles,
  Layers,
  Calendar,
  ShieldCheck,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  ListOrdered,
  FileText,
  Building,
} from "lucide-react";
import { BookDetailDto } from "@/modules/library/application/dto/response/BookDetailDto";
import { BookViewerContextDto } from "@/modules/books/application/queries/GetBookViewerContext/handler";
import { AuthorBooksDto } from "@/modules/books/application/queries/GetBooksByAuthor/handler";
import { generateSimpleDescription } from "@/modules/storage/services/pdf-description-generator";
import { addBookToLibraryAction } from "@/modules/library/presentation/actions/library";
import BookCard from "@/modules/books/components/BookCard";
import AddToShelfButton from "@/modules/books/components/AddToShelfButton";
import DefaultBookCover from "./DefaultBookCover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface BookDetailHeroProps {
  book: BookDetailDto;
  viewer?: BookViewerContextDto;
  relatedBooks?: any[];
  authorWorks?: AuthorBooksDto | null;
}

export function BookDetailHero({
  book,
  viewer,
  relatedBooks = [],
  authorWorks,
}: BookDetailHeroProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "contents" | "metadata"
  >("overview");

  const [readingStatus, setReadingStatus] = useState<
    "none" | "want_to_read" | "currently_reading" | "finished"
  >(
    viewer?.readingStatus ||
    (viewer?.libraryStatus === "in_library" ? "want_to_read" : "none"),
  );
  const [progressPercentage, setProgressPercentage] = useState(
    viewer?.progressPercentage || 0,
  );
  const [currentPage] = useState(viewer?.currentPage);
  const [totalPages] = useState(viewer?.totalPages || book.pageCount || 0);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const authorScrollRef = useRef<HTMLDivElement>(null);

  const inLibrary = readingStatus !== "none";

  const authorNames = useMemo(() => {
    if (!book.authors || book.authors.length === 0)
      return "BookGarden Archive";
    const names = book.authors
      .map((a: any) => (typeof a === "string" ? a : a?.name))
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "BookGarden Archive";
  }, [book.authors]);

  const year = book.publishedDate
    ? new Date(book.publishedDate).getFullYear()
    : "Historic Edition";

  const primaryGenre = useMemo(() => {
    const g = book.genres?.[0];
    if (!g) return "Literature";
    return typeof g === "string" ? g : (g as any)?.name || "Literature";
  }, [book.genres]);

  const rawDescription =
    book.description || generateSimpleDescription(book.title, authorNames);

  // Parse structured sections from description if present
  const parsedSections = useMemo(() => {
    if (!rawDescription) return { mainText: "", stages: [] };

    const stageMatches = rawDescription.match(
      /(Basic Level|Intermediate Level|Advanced Level|Stage \d+|Part \d+|Volume \d+):\s*([^.]+\.)/gi,
    );

    let mainText = rawDescription;
    const stages: { label: string; text: string }[] = [];

    if (stageMatches && stageMatches.length > 0) {
      stageMatches.forEach((m) => {
        const parts = m.split(/:\s*/);
        if (parts.length >= 2) {
          stages.push({
            label: parts[0].trim(),
            text: parts.slice(1).join(": ").trim(),
          });
        }
        mainText = mainText.replace(m, "");
      });
      mainText = mainText.replace(/Core Content/gi, "").trim();
    }

    return {
      mainText: mainText || rawDescription,
      stages,
    };
  }, [rawDescription]);

  const handleSetState = async (
    targetState: "want_to_read" | "currently_reading" | "finished" | "remove",
  ) => {
    if (isUpdatingState) return;
    setIsUpdatingState(true);

    try {
      if (targetState === "remove") {
        const { removeBookFromLibraryAction } = await import(
          "@/modules/library/presentation/actions/library"
        );
        await removeBookFromLibraryAction(book.id);
        setReadingStatus("none");
      } else {
        await addBookToLibraryAction(book.id, targetState);
        setReadingStatus(targetState);
        if (targetState === "finished") {
          setProgressPercentage(100);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsUpdatingState(false);
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Read "${book.title}" on BookGarden Digital Archive`,
          url: window.location.href,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard fallback
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  const scrollAuthorLeft = () => {
    if (authorScrollRef.current) {
      authorScrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const scrollAuthorRight = () => {
    if (authorScrollRef.current) {
      authorScrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  // Compute CTA label
  const ctaLabel = useMemo(() => {
    if (readingStatus === "currently_reading") return "Continue Reading";
    if (readingStatus === "finished") return "Read Again";
    return "Start Reading";
  }, [readingStatus]);

  return (
    <div className="w-full space-y-8 sm:space-y-12">
      {/* 1. Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Discover</span>
          </Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">
            {primaryGenre}
          </span>
          <span>/</span>
          <span className="truncate max-w-[200px] sm:max-w-xs">
            {book.title}
          </span>
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs cursor-default"
                aria-label="Verified Digital Edition"
              >
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Verified Digital Edition</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Scholarly digitized edition preserved in BookGarden Digital Archive
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 2. Hero Spotlight Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 lg:p-10 transition-colors">
        {/* Subtle Ambient Blurred Backdrop Glow */}
        {book.coverUrl && (
          <div className="absolute right-0 top-0 w-full sm:w-2/3 h-full opacity-10 dark:opacity-20 blur-3xl pointer-events-none overflow-hidden">
            <Image
              src={book.coverUrl.replace(/ /g, "%20")}
              alt=""
              fill
              className="object-cover"
              sizes="60vw"
            />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-start">
          {/* Left: 3D Hardcover Cover */}
          <div className="w-[180px] min-[400px]:w-[210px] sm:w-[240px] md:w-[260px] lg:w-[280px] shrink-0">
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-slate-200 dark:border-slate-700/80 group">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl.replace(/ /g, "%20")}
                  alt={`Cover of ${book.title}`}
                  fill
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 240px, 280px"
                />
              ) : (
                <DefaultBookCover
                  title={book.title}
                  authors={authorNames}
                  genre={primaryGenre}
                />
              )}
            </div>
          </div>

          {/* Right: Title, Author, Badges, Primary Actions & Quick Metrics */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-6 text-left w-full">
            <div>
              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {book.genres && book.genres.length > 0 ? (
                  book.genres.map((g: any, idx: number) => {
                    const name = typeof g === "string" ? g : g.name;
                    if (!name) return null;

                    return (
                      <span
                        key={g.id || name || `genre-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider"
                      >
                        {idx === 0 && (
                          <Sparkles size={12} className="text-amber-400" />
                        )}
                        <span>{name}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={12} />
                    <span>{primaryGenre}</span>
                  </span>
                )}

                {/* Live Reading State Badge */}
                {readingStatus === "currently_reading" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm animate-in fade-in">
                    <BookOpen size={12} />
                    <span>Reading ({progressPercentage}%)</span>
                  </span>
                )}
                {readingStatus === "finished" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm animate-in fade-in">
                    <Check size={12} />
                    <span>Finished</span>
                  </span>
                )}
                {readingStatus === "want_to_read" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider shadow-xs animate-in fade-in">
                    <Bookmark size={12} />
                    <span>Want to Read</span>
                  </span>
                )}
              </div>

              {/* Title & Author */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
                {book.title}
              </h1>

              <p className="text-base sm:text-lg text-indigo-600 dark:text-indigo-400 font-semibold">
                by {authorNames}
              </p>
            </div>

            {/* Reading Progress Indicator (if currently reading) */}
            {readingStatus === "currently_reading" && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 max-w-xl space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  <span>
                    {currentPage && totalPages
                      ? `Page ${currentPage} of ${totalPages}`
                      : "Reading in Progress"}
                  </span>
                  <span>{progressPercentage}% completed</span>
                </div>
                <div className="w-full h-2 bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, progressPercentage)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap pt-1 relative">
              <Link
                href={`/read/${book.id}`}
                className="h-12 sm:h-13 px-8 sm:px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Play
                  size={17}
                  className="fill-white text-white translate-x-0.5"
                />
                <span>{ctaLabel}</span>
              </Link>

              {/* Shelf Status Dropdown Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdatingState}
                    aria-label="Reading status"
                    className={`h-12 sm:h-13 px-5 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                      inLibrary
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/80"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    }`}
                  >
                    {isUpdatingState ? (
                      <span>Updating...</span>
                    ) : readingStatus === "want_to_read" ? (
                      <>
                        <Bookmark size={15} className="text-amber-500" />
                        <span>Want to Read</span>
                      </>
                    ) : readingStatus === "currently_reading" ? (
                      <>
                        <BookOpen
                          size={15}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                        <span>Currently Reading</span>
                      </>
                    ) : readingStatus === "finished" ? (
                      <>
                        <Check
                          size={15}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                        <span>Finished</span>
                      </>
                    ) : (
                      <>
                        <Bookmark size={15} />
                        <span>Add to Library</span>
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Set Shelf Status
                  </div>
                  <DropdownMenuItem
                    onClick={() => handleSetState("want_to_read")}
                    className={`flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold ${
                      readingStatus === "want_to_read"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold"
                        : ""
                    }`}
                  >
                    <span>Want to Read</span>
                    {readingStatus === "want_to_read" && <Check size={14} />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSetState("currently_reading")}
                    className={`flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold ${
                      readingStatus === "currently_reading"
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                        : ""
                    }`}
                  >
                    <span>Currently Reading</span>
                    {readingStatus === "currently_reading" && <Check size={14} />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSetState("finished")}
                    className={`flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold ${
                      readingStatus === "finished"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                        : ""
                    }`}
                  >
                    <span>Finished</span>
                    {readingStatus === "finished" && <Check size={14} />}
                  </DropdownMenuItem>

                  {inLibrary && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => handleSetState("remove")}
                        className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-bold text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <span>Remove from Library</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add to Shelf Button */}
              <AddToShelfButton
                bookId={book.id}
                bookTitle={book.title}
                variant="hero"
              />

              {/* Share Button with Tooltip */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleShare}
                      aria-label={copied ? "Link Copied" : "Share this book"}
                      className={`h-12 sm:h-13 px-5 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                        copied
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/80"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check
                            size={16}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2
                            size={15}
                            className="text-slate-600 dark:text-slate-300"
                          />
                          <span>Share</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {copied ? "URL copied to clipboard" : "Share this book"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Book Description / Synopsis */}
            {rawDescription && (
              <div className="pt-1 text-slate-700 dark:text-slate-300">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-sans">
                  {parsedSections.mainText || rawDescription}
                </p>
              </div>
            )}

            {/* Essential Reading Metrics */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1 max-w-lg">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs mb-1">
                  <Layers size={13} />
                  <span>Pages</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                  {book.pageCount ? `${book.pageCount} Pages` : "Complete Text"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs mb-1">
                  <Clock size={13} />
                  <span>Est. Read</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                  {(() => {
                    if (!book.pageCount || book.pageCount <= 0)
                      return "~3.5 hours";
                    const totalMinutes = Math.round(book.pageCount * 1.5);
                    if (totalMinutes < 60) return `~${totalMinutes} mins`;
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours} hours`;
                  })()}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs mb-1">
                  <Calendar size={13} />
                  <span>Published</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                  {year}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto select-none">
        {[
          { key: "overview", label: "Curriculum & Themes", icon: Sparkles },
          { key: "contents", label: "Structure & Chapters", icon: ListOrdered },
          { key: "metadata", label: "Archival Details", icon: ShieldCheck },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <IconComponent size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Area */}
      <div className="animate-in fade-in duration-200">
        {/* TAB 1: CURRICULUM & THEMES */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* Learning Stages / Levels if present */}
              {parsedSections.stages.length > 0 ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      Curriculum & Core Milestones
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedSections.stages.map((st, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                      >
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {st.label}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                          {st.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      Archival Preservation Summary
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
                    This scholarly edition is preserved within the BookGarden Digital Archive, optimized for in-browser vector reading, cross-device synchronization, and offline study.
                  </p>
                </div>
              )}

              {/* Subject Badges */}
              {book.subjects && book.subjects.length > 0 && (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Tag size={13} />
                    <span>Knowledge Domains & Subjects</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {book.subjects.map((sub: any, idx: number) => {
                      const name = typeof sub === "string" ? sub : sub.name;
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          #{name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Quick Reading Action Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white border border-indigo-800/30 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>Digital Preservation Edition</span>
                </div>
                <h4 className="text-lg font-extrabold text-white leading-snug">
                  Immersive Reading Shell
                </h4>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Preserved in high-fidelity vectorized format with bookmarking,
                  annotations, and automatic progress synchronization across all
                  devices.
                </p>
                <Link
                  href={`/read/${book.id}`}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>Launch Reader</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STRUCTURE & CHAPTERS */}
        {activeTab === "contents" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ListOrdered size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Document Structure & Navigation
                  </h3>
                  <p className="text-xs text-slate-400">
                    {book.pageCount
                      ? `${book.pageCount} Pages • Complete Digitized Edition`
                      : "Preserved Full-Text Volume"}
                  </p>
                </div>
              </div>

              <Link
                href={`/read/${book.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
              >
                <span>Open in Reader</span>
                <Play size={11} className="fill-current" />
              </Link>
            </div>

            {/* Document Structure Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Document Format</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                  PDF Preservation Edition
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Pagination</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {book.pageCount ? `${book.pageCount} Sequential Pages` : "Continuous Document"}
                </p>
              </div>
            </div>

            {/* Interactive TOC Notice */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  Interactive Table of Contents
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Open the reader to explore the full native outline, jump to chapters, and search the document.
                </p>
              </div>

              <Link
                href={`/read/${book.id}`}
                className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <span>View Outline</span>
                <Play size={11} className="fill-current" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 3: ARCHIVAL DETAILS */}
        {activeTab === "metadata" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Publication & Archival Metadata
                </h3>
                <p className="text-xs text-slate-400">
                  Digitized Public Domain & Scholarly Catalog Record
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Building size={13} />
                  <span>Publisher</span>
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {book.publisher || "BookGarden Archival Editions"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>Publication Date</span>
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {book.publishedDate
                    ? new Date(book.publishedDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                    : "Archival Record"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Globe size={13} />
                  <span>Language</span>
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  English (Preserved Edition)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>File Format</span>
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {(book as any).format || "Digitized PDF"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} />
                  <span>Total Page Count</span>
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {book.pageCount ? `${book.pageCount} Pages` : "Full Edition"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Direct Shelf Section: Author Works & Related Recommendations */}
      <div className="space-y-10 sm:space-y-12 pt-4">
        {/* Author Works Shelf */}
        {authorWorks &&
          authorWorks.books &&
          authorWorks.books.length > 0 ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  More Works by {authorWorks.authorName}
                </h3>
                <p className="text-xs text-slate-400">
                  Preserved writings from this author
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={scrollAuthorLeft}
                  aria-label="Scroll author works left"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={scrollAuthorRight}
                  aria-label="Scroll author works right"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            <div
              ref={authorScrollRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 no-scrollbar"
            >
              {authorWorks.books.map((b: any, idx: number) => (
                <div
                  key={b.id || idx}
                  className="w-[160px] sm:w-[185px] shrink-0 snap-start"
                >
                  <BookCard
                    book={{
                      id: b.id,
                      slug: b.slug || b.id,
                      title: b.title,
                      authors: [{ name: authorWorks.authorName }],
                      genres: b.genres || [],
                      coverUrl: b.coverUrl
                        ? b.coverUrl.replace(/ /g, "%20")
                        : null,
                      publicationYear: b.publicationYear,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Related Thematic Works Shelf */}
        {relatedBooks && relatedBooks.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Recommended Related Volumes
                </h3>
                <p className="text-xs text-slate-400">
                  Curated works in {primaryGenre}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={scrollLeft}
                  aria-label="Scroll related books left"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={scrollRight}
                  aria-label="Scroll related books right"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 no-scrollbar"
            >
              {relatedBooks.map((b: any, idx: number) => (
                <div
                  key={b.id || idx}
                  className="w-[160px] sm:w-[185px] shrink-0 snap-start"
                >
                  <BookCard
                    book={{
                      id: b.id,
                      slug: b.slug || b.id,
                      title: b.title,
                      authors: b.authors || [],
                      genres: b.genres || [],
                      coverUrl: b.coverUrl
                        ? b.coverUrl.replace(/ /g, "%20")
                        : null,
                      publicationYear: b.publicationYear,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookDetailHero;
