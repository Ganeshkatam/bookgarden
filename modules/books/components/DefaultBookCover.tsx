"use client";

import React, { useMemo } from "react";
import Image from "next/image";

interface DefaultBookCoverProps {
  title: string;
  authors?: string | readonly { readonly name: string }[] | readonly string[] | { name: string }[] | null;
  genre?: string | { name: string } | null;
  className?: string;
}

export default function DefaultBookCover({
  title,
  authors,
  genre,
  className = "",
}: DefaultBookCoverProps) {
  const authorName = useMemo(() => {
    if (!authors) return "BookGarden Library";
    if (typeof authors === "string") return authors;
    if (Array.isArray(authors)) {
      return authors.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean).join(", ") || "BookGarden Library";
    }
    return "BookGarden Library";
  }, [authors]);

  const genreLabel = useMemo(() => {
    if (!genre) return null;
    if (typeof genre === "string") return genre;
    return (genre as any).name || null;
  }, [genre]);

  return (
    <div
      className={`relative w-full h-full aspect-[2/3] select-none overflow-hidden bg-slate-950 flex flex-col justify-between ${className}`}
    >
      {/* 1. Realistic Antique Leather-bound Photograph Background */}
      <Image
        src="/default_book_cover.jpg"
        alt={title}
        fill
        sizes="(max-width: 480px) 40vw, (max-width: 768px) 30vw, 260px"
        className="object-cover"
        priority={false}
      />

      {/* Subtle Vignette & Shadow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50 z-10 pointer-events-none" />

      {/* 2. Top Archival Tag */}
      <div className="relative z-20 text-center pt-2 sm:pt-3 px-2">
        <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] uppercase text-amber-200/75 drop-shadow-md font-extrabold block">
          Digital Archive
        </span>
        {genreLabel && (
          <span className="text-[7.5px] sm:text-[8px] uppercase tracking-wider text-amber-300/90 font-bold truncate block mt-0.5 drop-shadow-sm">
            {genreLabel}
          </span>
        )}
      </div>

      {/* 3. Center Imprinted Title */}
      <div className="relative z-20 my-auto text-center px-3 sm:px-4 py-1 flex flex-col items-center">
        <h3 className="font-serif font-extrabold text-xs sm:text-sm md:text-base leading-snug line-clamp-3 uppercase tracking-wide text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {title}
        </h3>
        <div className="w-8 h-px bg-amber-400/40 my-1.5 sm:my-2 shadow-xs" />
      </div>

      {/* 4. Bottom Author Credits */}
      <div className="relative z-20 text-center pb-2 sm:pb-2.5 px-2">
        <p className="text-[8.5px] sm:text-[9.5px] font-sans font-semibold text-amber-200/90 drop-shadow-md line-clamp-1 truncate">
          by {authorName}
        </p>
      </div>
    </div>
  );
}
