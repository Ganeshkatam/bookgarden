"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, Flame, ChevronLeft, ChevronRight, BookOpen, Plus } from "lucide-react";
import BookCard from "@/modules/books/components/BookCard";
import DefaultBookCover from "@/modules/books/components/DefaultBookCover";
import type { DiscoveryOverviewPageDto } from "@/modules/discovery/application/facades/DiscoveryFacade";

interface MeHeroSectionProps {
  promise: Promise<DiscoveryOverviewPageDto>;
}

export default function MeHeroSection({ promise }: MeHeroSectionProps) {
  const result = use(promise);
  const trendingBooks = result?.trending?.books || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [domActiveIndex, setDomActiveIndex] = useState(2); // Start at index 2 (first real book)
  const [isMounted, setIsMounted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const books = trendingBooks.slice(0, 10);
  const realCount = books.length;

  // Create padded array for true infinite circular scroll (clones on both ends)
  const paddedBooks = React.useMemo(() => {
    if (realCount <= 1) return books;
    return [
      { ...books[realCount - 2], _cloneId: 'p2' },
      { ...books[realCount - 1], _cloneId: 'p1' },
      ...books.map((b: any, i: number) => ({ ...b, _cloneId: `o${i}` })),
      { ...books[0], _cloneId: 'a1' },
      { ...books[1], _cloneId: 'a2' },
    ];
  }, [books, realCount]);

  // Uninterrupted continuous auto-scroll timer for the desktop billboard only
  useEffect(() => {
    if (realCount <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % realCount);
    }, 5500);
    return () => clearInterval(timer);
  }, [realCount]);

  // Initial jump to real first item and fade in
  useEffect(() => {
    if (mobileScrollRef.current && realCount > 1) {
      const container = mobileScrollRef.current;
      const child = container.children[2] as HTMLElement;
      if (child) {
        const scrollTarget = child.offsetLeft - (container.clientWidth - child.clientWidth) / 2;
        container.scrollTo({ left: scrollTarget, behavior: 'auto' });
      }
    }
    // Fade in after jump to hide the jump
    requestAnimationFrame(() => setIsMounted(true));
  }, [realCount]);

  // Mobile Infinite Auto-scroll Timer
  useEffect(() => {
    if (realCount <= 1) return;
    const timer = setInterval(() => {
      const container = mobileScrollRef.current;
      if (container && window.getComputedStyle(container).display !== "none") {
        const nextDomIndex = domActiveIndex + 1;
        const child = container.children[nextDomIndex] as HTMLElement;
        if (child) {
          const scrollTarget = child.offsetLeft - (container.clientWidth - child.clientWidth) / 2;
          container.scrollTo({ left: scrollTarget, behavior: "smooth" });
        }
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [realCount, domActiveIndex]);

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (realCount <= 1) return;
    const container = e.currentTarget;
    const children = Array.from(container.children);
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    
    children.forEach((child, index) => {
      const childCenter = (child as HTMLElement).offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== domActiveIndex) {
      setDomActiveIndex(closestIndex);
    }

    // Silent infinite jump logic
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (closestIndex < 2 || closestIndex >= 2 + realCount) {
         let targetIndex = closestIndex;
         if (closestIndex < 2) targetIndex = closestIndex + realCount;
         else if (closestIndex >= 2 + realCount) targetIndex = closestIndex - realCount;

         const targetChild = container.children[targetIndex] as HTMLElement;
         if (targetChild) {
           const scrollTarget = targetChild.offsetLeft - (container.clientWidth - targetChild.clientWidth) / 2;
           // Assign scrollLeft directly to ensure an instant, un-animated jump across all browsers
           container.scrollLeft = scrollTarget;
           setDomActiveIndex(targetIndex);
         }
      }
    }, 150); // Execute jump after scrolling stops
  };

  if (trendingBooks.length === 0) {
    return null;
  }

  const spotlightBook = trendingBooks[activeIndex] || trendingBooks[0];

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="space-y-4 sm:space-y-5">

      {/* MOBILE SWIPING HERO (Hidden on SM and up, Infinite Stacked style) */}
      <div 
        ref={mobileScrollRef}
        className={`flex sm:hidden overflow-x-auto snap-x snap-mandatory pb-6 pt-2 no-scrollbar px-3 transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`} 
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onScroll={handleMobileScroll}
      >
        {paddedBooks.map((book: any, idx: number) => {
          const isActive = domActiveIndex === idx;
          
          return (
            <div 
              key={`mobile-hero-${book.id}-${idx}`} 
              className={`w-[85vw] max-w-[380px] shrink-0 snap-center aspect-square rounded-[2.5rem] relative overflow-hidden shadow-[20px_0_40px_-10px_rgba(0,0,0,0.7)] border border-slate-700/80 bg-slate-950 transition-all duration-300 ${idx > 0 ? '-ml-14' : 'ml-2'}`}
              style={{ 
                zIndex: isActive ? 50 : 40 - Math.abs(domActiveIndex - idx),
                transform: isActive ? 'scale(1)' : 'scale(0.9)',
                opacity: isActive ? 1 : 0.6
              }}
            >
              {/* Full-bleed background image */}
              {book.coverUrl ? (
                <Image src={book.coverUrl} fill className="object-cover" alt={book.title} sizes="400px" priority={idx === 2} />
              ) : (
                <div className="absolute inset-0 bg-slate-800" />
              )}

              {/* Gradient overlays for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent z-10 pointer-events-none" />

              <div className="absolute inset-0 z-20 flex flex-col justify-end p-5">
                <div className="flex items-end justify-between w-full gap-4">
                  {/* Left Side: Title & Metadata */}
                  <div className="flex-1 min-w-0 pb-1">
                    <h2 className="text-3xl font-display font-black text-white mb-1 line-clamp-2 drop-shadow-xl leading-tight uppercase tracking-tight">{book.title}</h2>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider truncate drop-shadow-md">
                      <span className="truncate">{book.authors?.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean).join(", ") || "BookGarden"}</span>
                      {book.genres && book.genres.length > 0 && (
                        <>
                          <span className="text-slate-500">•</span>
                          <span className="truncate">{typeof book.genres[0] === "string" ? book.genres[0] : book.genres[0].name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Stacked Circular Buttons */}
                  <div className="flex flex-col gap-3 shrink-0 pb-1">
                    <Link href={`/book/${book.id}`} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-xl active:scale-95 transition-all" aria-label="Book Details">
                      <Plus size={20} />
                    </Link>
                    <Link href={`/read/${book.id}`} className="w-11 h-11 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-black shadow-xl active:scale-95 transition-all" aria-label="Start Reading">
                      <BookOpen size={18} className="fill-black" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP BILLBOARD HERO (Hidden on mobile) */}
      <div className="hidden sm:block relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800/80 shadow-2xl text-white">

        {/* Ambient Backdrop Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent z-10 pointer-events-none" />
        {spotlightBook.coverUrl && (
          <div className="absolute right-0 top-0 w-full sm:w-2/3 h-full opacity-20 dark:opacity-30 blur-3xl pointer-events-none overflow-hidden transition-all duration-700">
            <Image
              src={spotlightBook.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="60vw"
              priority
              loading="eager"
            />
          </div>
        )}

        <div className="relative z-20 p-7 lg:p-9 flex flex-row items-center justify-between gap-8 lg:gap-12">

          {/* Left Metadata & CTAs */}
          <div className="flex-1 flex flex-col justify-between max-w-2xl lg:max-w-3xl">
            <div>
              {/* Badge */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider shadow-xs">
                  <Flame size={14} className="text-red-500 fill-red-500" />
                  <span># {activeIndex + 1} Trending in Digital Archives</span>
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight leading-tight mb-2 drop-shadow-md line-clamp-2 transition-all duration-300">
                {spotlightBook.title}
              </h2>

              <p className="text-base text-indigo-300 font-medium mb-3">
                by {spotlightBook.authors?.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean).join(", ") || "BookGarden Library"}
              </p>

              {spotlightBook.genres && spotlightBook.genres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-3.5">
                  {spotlightBook.genres.slice(0, 3).map((g: any, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 text-[11px] font-semibold border border-slate-700/80 shadow-xs"
                    >
                      {typeof g === "string" ? g : g.name}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-sm text-slate-300 font-serif line-clamp-3 leading-relaxed max-w-2xl">
                Immerse yourself in this timeless literary masterpiece from our curated global public domain archives.
              </p>
            </div>

            {/* Action Buttons & Indicator Dots */}
            <div className="pt-5 space-y-3.5">
              <div className="flex items-center gap-3.5 flex-wrap">
                <Link
                  href={`/read/${spotlightBook.id}`}
                  className="h-12 px-7 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <BookOpen size={18} className="fill-slate-950 text-slate-950 translate-x-0.5" />
                  <span>Start Reading</span>
                </Link>
                <Link
                  href={`/book/${spotlightBook.id}`}
                  className="h-12 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-base border border-slate-700/80 backdrop-blur-md flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Info size={18} />
                  <span>Book Details</span>
                </Link>
              </div>

              {/* Progress Slide Indicator Strip */}
              <div className="flex items-center gap-1.5 pt-1">
                {trendingBooks.slice(0, 10).map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeIndex === i
                      ? "w-7 bg-red-500 shadow-xs"
                      : "w-2.5 bg-slate-700 hover:bg-slate-500"
                      }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Spotlight Cover */}
          <div className="flex-shrink-0 relative group self-center">
            <div className="w-[210px] md:w-[235px] lg:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative border border-slate-700/80 transform md:group-hover:scale-105 transition-transform duration-300">
              {spotlightBook.coverUrl ? (
                <Image
                  src={spotlightBook.coverUrl}
                  alt={spotlightBook.title}
                  fill
                  className="object-cover"
                  sizes="260px"
                  priority
                  loading="eager"
                />
              ) : (
                <DefaultBookCover
                  title={spotlightBook.title}
                  authors={spotlightBook.authors}
                  genre={spotlightBook.genres?.[0]?.name || spotlightBook.genres?.[0]}
                />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Trending Books Carousel Row (Static, no auto-scrolling) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-red-500 fill-red-500" />
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Top Trending in Digital Archives
            </h3>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              aria-label="Previous trending book"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Next trending book"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Row */}
        <div
          ref={scrollRef}
          className="flex items-start gap-4 sm:gap-5 overflow-x-auto pt-3 pb-4 px-1.5 no-scrollbar scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {trendingBooks.slice(0, 10).map((book: any, idx: number) => {
            const isSelected = activeIndex === idx;
            const rank = idx + 1;

            return (
              <div
                key={`trending-shelf-${book.id || idx}-${idx}`}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                onClick={() => setActiveIndex(idx)}
                className={`w-[130px] min-[400px]:w-[145px] sm:w-[170px] md:w-[190px] lg:w-[205px] xl:w-[215px] shrink-0 snap-start flex flex-col relative transition-all duration-300 cursor-pointer hover:z-40 ${isSelected ? "opacity-100" : "opacity-90 hover:opacity-100"
                  }`}
              >
                {/* Clean Rank Badge on top-left corner */}
                <div
                  className={`absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-lg text-xs font-black shadow-md ${isSelected
                    ? "bg-red-500 text-white"
                    : "bg-slate-900/90 text-slate-200 border border-slate-700/80"
                    }`}
                >
                  #{rank}
                </div>

                <BookCard book={book} priority={idx < 5} />
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
