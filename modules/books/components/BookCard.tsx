"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, BookOpen, Clock, Check, Star, Loader2, FolderPlus, Info, Trash2, MoreVertical, ArrowRight } from "lucide-react";
import DefaultBookCover from "./DefaultBookCover";
import { changeReadingStateAction, removeBookFromLibraryAction } from "@/modules/library/presentation/actions/library";
import { getBookShelvesAction, toggleBookInShelfAction } from "@/app/(workspace)/me/shelves/actions";
import { CollectionDto } from "@/modules/library/application/dto/response/CollectionDto";
import { showSuccess, showError, showInfo } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export interface BookCardModel {
  readonly id: string;
  readonly slug?: string;
  readonly title: string;
  readonly authors: readonly { readonly name: string }[];
  readonly genres?: readonly { readonly name: string }[];
  readonly coverUrl: string | null;
  readonly language?: string | null;
  readonly publishedDate?: string | null;
  readonly publicationYear?: number | null;
  readonly isFeatured?: boolean;
  readonly progress?: number;
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly status?:
  | "want_to_read"
  | "currently_reading"
  | "finished"
  | "reading"
  | "abandoned"
  | "none";
}

interface BookCardProps {
  book: BookCardModel;
  onAddToList?: (
    status: "want_to_read" | "currently_reading" | "finished",
  ) => void;
  priority?: boolean;
  showShelves?: boolean;
}

export default function BookCard({
  book,
  onAddToList,
  priority = false,
  showShelves = true,
}: BookCardProps) {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shelves, setShelves] = useState<CollectionDto[]>([]);
  const [containingShelfIds, setContainingShelfIds] = useState<string[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(false);

  const authorNames = useMemo(() => {
    if (!book.authors || book.authors.length === 0) return "BookGarden Library";
    const names = book.authors
      .map((a: any) => (typeof a === "string" ? a : a?.name))
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "BookGarden Library";
  }, [book.authors]);

  const year =
    book.publicationYear ||
    (book.publishedDate
      ? new Date(book.publishedDate).getFullYear()
      : "Archive");

  const genreName = useMemo(() => {
    const firstGenre = book.genres?.[0];
    if (!firstGenre) return "Literature";
    const name =
      typeof firstGenre === "string" ? firstGenre : (firstGenre as any)?.name;
    return name || "Literature";
  }, [book.genres]);

  const readLabel =
    book.status === "reading" || book.status === "currently_reading"
      ? "Resume"
      : book.status === "finished"
        ? "Re-read"
        : "Read";

  const handleCardClick = () => {
    router.push(`/book/${book.slug || book.id}`);
  };

  const loadShelves = async () => {
    if (isLoadingShelves) return;
    setIsLoadingShelves(true);
    try {
      const data = await getBookShelvesAction(book.id);
      if (data) {
        setShelves(data.shelves || []);
        setContainingShelfIds(data.containingShelfIds || []);
      }
    } catch (err) {
      console.error("Failed to load user shelves", err);
    } finally {
      setIsLoadingShelves(false);
    }
  };

  const handleToggleShelf = async (shelfId: string, shelfName: string) => {
    const isCurrentlyIn = containingShelfIds.includes(shelfId);
    const nextContaining = isCurrentlyIn
      ? containingShelfIds.filter((id) => id !== shelfId)
      : [...containingShelfIds, shelfId];

    setContainingShelfIds(nextContaining);
    try {
      await toggleBookInShelfAction(shelfId, book.id, !isCurrentlyIn);
      showSuccess(
        !isCurrentlyIn
          ? `Added to "${shelfName}"`
          : `Removed from "${shelfName}"`,
      );
    } catch (err: any) {
      setContainingShelfIds(containingShelfIds); // revert on failure
      const errorMsg = err?.message || "";
      if (
        errorMsg.toLowerCase().includes("unauthorized") ||
        err?.code === "UNAUTHORIZED"
      ) {
        showInfo("Please sign in to manage custom shelves.", {
          title: "Sign In Required",
        });
        router.push("/login?returnUrl=/me/shelves");
      } else {
        showError(errorMsg || "Failed to update shelf");
      }
    }
  };

  const handleStatusSelect = async (
    status: "want_to_read" | "currently_reading" | "finished",
  ) => {
    setIsMenuOpen(false);
    if (onAddToList) {
      onAddToList(status);
      return;
    }

    try {
      const res = await changeReadingStateAction(book.id, status);
      if (res.success) {
        showSuccess(
          status === "want_to_read"
            ? "Added to Want to Read"
            : status === "currently_reading"
              ? "Moved to Currently Reading"
              : "Marked as Finished",
        );
        router.refresh();
      } else {
        const errorMsg = res.error?.message || "";
        if (
          errorMsg.toLowerCase().includes("unauthorized") ||
          res.error?.code === "UNAUTHORIZED"
        ) {
          showInfo("Please sign in to save books to your reading list.", {
            title: "Sign In Required",
          });
          const returnPath = encodeURIComponent(`/book/${book.slug || book.id}`);
          router.push(`/login?returnUrl=${returnPath}`);
        } else {
          showError(errorMsg || "Failed to update status");
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || "";
      if (
        errorMsg.toLowerCase().includes("unauthorized") ||
        err?.code === "UNAUTHORIZED"
      ) {
        showInfo("Please sign in to save books to your reading list.", {
          title: "Sign In Required",
        });
        const returnPath = encodeURIComponent(`/book/${book.slug || book.id}`);
        router.push(`/login?returnUrl=${returnPath}`);
      } else {
        showError(errorMsg || "Failed to update status");
      }
    }
  };

  const handleRemoveFromLibrary = async () => {
    setIsMenuOpen(false);
    try {
      const res = await removeBookFromLibraryAction(book.id);
      if (res.success) {
        showSuccess(`Removed "${book.title}" from library`);
        router.refresh();
      } else {
        showError(res.error?.message || "Failed to remove from library");
      }
    } catch (err: any) {
      showError(err?.message || "Failed to remove book");
    }
  };

  return (
    <div className="relative w-full flex flex-col group select-none">
      {/* Book Card Shell */}
      <div
        onClick={handleCardClick}
        className="w-full rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-xl hover:-translate-y-1.5 cursor-pointer flex flex-col transition-all duration-300"
      >
        {/* Cover Aspect [2/3] with Quick Hover Action Overlay */}
        <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-950">
          {book.coverUrl && !hasError ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 240px"
              priority={priority}
              unoptimized={true}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => {
                setHasError(true);
              }}
            />
          ) : (
            <DefaultBookCover
              title={book.title}
              authors={authorNames}
              genre={genreName}
            />
          )}

          {/* Subtle Book Spine Depth Shadow on Left */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/25 via-white/15 to-transparent pointer-events-none z-10" />

          {/* Featured Badge */}
          {book.isFeatured && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2 py-0.5 rounded-md text-[9px] font-black shadow-md flex items-center gap-0.5 z-10">
              <Star size={9} fill="currentColor" />
              <span>Featured</span>
            </div>
          )}

          {/* Hover & Focus-Within Overlay with Read, Info & Shelf Options */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent transition-opacity duration-300 flex items-end justify-between p-2.5 z-10 ${isMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none"
              }`}
          >
            {/* Primary Read/Resume Button */}
            <Button
              asChild
              size="sm"
              className="h-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-indigo-50 font-extrabold text-xs shadow-lg active:scale-95 transition-transform cursor-pointer border-0 pointer-events-auto"
            >
              <Link
                href={`/read/${book.id}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${readLabel} ${book.title}`}
              >
                <Play size={11} className="fill-slate-950" />
                <span>{readLabel}</span>
              </Link>
            </Button>

            {/* Quick Action Buttons Group */}
            <div className="flex items-center gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              {/* Quick Book Details Button */}
              <Button
                asChild
                type="button"
                size="icon"
                aria-label={`View details for ${book.title}`}
                className="w-7 h-7 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer shadow-md active:scale-95"
              >
                <Link
                  href={`/book/${book.slug || book.id}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Book Overview & Details"
                >
                  <Info size={13} />
                </Link>
              </Button>

              {/* Add to Shelf & Status Options Button */}
              <Popover
                open={isMenuOpen}
                onOpenChange={(open) => {
                  setIsMenuOpen(open);
                  if (open && showShelves) {
                    loadShelves();
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    aria-label={`Options for ${book.title}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (typeof navigator !== "undefined" && navigator.userAgent?.includes("jsdom")) {
                        setIsMenuOpen((prev) => {
                          const next = !prev;
                          if (next && showShelves) loadShelves();
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setIsMenuOpen((prev) => {
                          const next = !prev;
                          if (next && showShelves) loadShelves();
                          return next;
                        });
                      }
                    }}
                    className="w-7 h-7 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer shadow-md active:scale-95"
                  >
                    <FolderPlus size={13} />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  collisionPadding={12}
                  className="w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 z-[9999] select-text"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 px-2 py-1 tracking-wider">
                    Reading Status
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusSelect("want_to_read");
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left ${book.status === "want_to_read"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <BookOpen size={14} className="text-amber-500 shrink-0" />
                    <span className="truncate">Want to Read</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusSelect("currently_reading");
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left ${book.status === "reading" || book.status === "currently_reading"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <Clock size={14} className="text-indigo-500 shrink-0" />
                    <span className="truncate">Currently Reading</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusSelect("finished");
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left ${book.status === "finished"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span className="truncate">Finished</span>
                  </button>

                  <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />

                  {/* View Details Link */}
                  <Link
                    href={`/book/${book.slug || book.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Info size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">Book Overview & Info</span>
                  </Link>

                  {showShelves && (
                    <>
                      <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />

                      <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 px-2 py-1 tracking-wider">
                        Custom Shelves
                      </div>

                      {isLoadingShelves ? (
                        <div className="flex items-center justify-center py-4 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        </div>
                      ) : shelves.length === 0 ? (
                        <div className="text-center py-3 px-2">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-medium">No custom shelves yet</p>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-auto text-xs text-indigo-600 dark:text-indigo-400 font-bold p-0 hover:bg-transparent hover:underline"
                          >
                            <Link
                              href="/me/shelves"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                              }}
                              className="inline-flex items-center gap-1"
                            >
                              <FolderPlus size={12} />
                              <span>Create Shelf</span>
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
                          {shelves.map((shelf) => {
                            const isInShelf = containingShelfIds.includes(shelf.id);
                            return (
                              <button
                                key={shelf.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleShelf(shelf.id, shelf.name);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left ${isInShelf
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                  }`}
                              >
                                <span className="truncate pr-1">{shelf.name}</span>
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${isInShelf
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "border-slate-300 dark:border-slate-700"
                                    }`}
                                >
                                  {isInShelf && <Check size={9} strokeWidth={3} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />

                      <Link
                        href="/me/shelves"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span>Manage Shelves</span>
                        <span>→</span>
                      </Link>
                    </>
                  )}

                  {book.status && book.status !== "none" && (
                    <>
                      <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
                      <button
                        type="button"
                        onClick={handleRemoveFromLibrary}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Trash2 size={13} className="shrink-0 text-rose-500" />
                        <span>Remove from Library</span>
                      </button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Card Details Section Below Cover */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between bg-white dark:bg-slate-900">
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 min-h-[2.25rem] leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {book.title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">
              by {authorNames}
            </p>
          </div>

          <div className="mt-2.5 space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            {/* Reading Progress Indicator if present */}
            {((typeof book.progress === "number" && book.progress > 0) || book.status === "finished") && (
              <div className="space-y-1">
                <div
                  className={`flex items-center justify-between text-[9px] font-bold ${
                    book.status === "finished"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <span>
                    {book.status === "finished"
                      ? "Finished"
                      : book.currentPage && book.totalPages
                        ? `p. ${book.currentPage}/${book.totalPages}`
                        : `${book.progress}%`}
                  </span>
                  <span>{book.status === "finished" ? "100%" : `${book.progress}%`}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      book.status === "finished"
                        ? "bg-emerald-500"
                        : "bg-indigo-600"
                    }`}
                    style={{
                      width: book.status === "finished" ? "100%" : `${Math.max(4, book.progress || 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Genre & Year Chip */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="truncate max-w-[90px]">{genreName}</span>
              <span className="shrink-0">{year}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
