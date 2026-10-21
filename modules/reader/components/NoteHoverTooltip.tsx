"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReaderStore } from "../state/reader-store";
import { ReaderNote } from "@/shared/core/events/types";
import { StickyNote, Edit3 } from "lucide-react";

interface NoteBadge {
  note: ReaderNote;
  highlightId: string;
  x: number;
  y: number;
}

interface NoteHoverTooltipProps {
  onEditNote?: (highlightId: string) => void;
}

export function NoteHoverTooltip({ onEditNote }: NoteHoverTooltipProps) {
  const { notes, clickedHighlightId, activeNote, preferences } = useReaderStore();
  const theme = preferences?.theme || "light";

  const [badges, setBadges] = useState<NoteBadge[]>([]);
  const [activePreview, setActivePreview] = useState<NoteBadge | null>(null);
  const activePreviewRef = useRef<NoteBadge | null>(null);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOverTooltipRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateActivePreview = useCallback((val: NoteBadge | null) => {
    activePreviewRef.current = val;
    setActivePreview(val);
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isOverTooltipRef.current) {
        updateActivePreview(null);
      }
    }, 200);
  }, [clearHideTimer, updateActivePreview]);

  // Compute positions of note indicator badges for all visible highlights with notes
  const updateBadges = useCallback(() => {
    const noteMap = new Map<string, ReaderNote>();
    for (const n of notes) {
      if (
        n.target.type === "highlight" &&
        n.target.highlightId &&
        n.bodyMarkdown?.trim().length > 0
      ) {
        noteMap.set(n.target.highlightId, n);
      }
    }

    if (noteMap.size === 0) {
      setBadges([]);
      return;
    }

    const calculated: NoteBadge[] = [];

    noteMap.forEach((note, highlightId) => {
      // If a native badge is already rendered in the document layer, do not duplicate
      const nativeBadge = document.querySelector(
        `.bookgarden-note-badge[data-note-indicator-badge="${highlightId}"]`,
      );
      if (nativeBadge) return;

      const els = document.querySelectorAll<HTMLElement>(
        `[data-highlight-id="${highlightId}"]`,
      );
      if (els.length === 0) return;

      const rects = Array.from(els)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);

      if (rects.length === 0) return;

      const minTop = Math.min(...rects.map((r) => r.top));
      const topRowRects = rects.filter((r) => Math.abs(r.top - minTop) < 8);
      const topRowRight = Math.max(...topRowRects.map((r) => r.right));
      const overallMaxRight = Math.max(...rects.map((r) => r.right));
      const anchorRight = Math.max(topRowRight, overallMaxRight);

      if (minTop > -60 && minTop < window.innerHeight + 60) {
        calculated.push({
          note,
          highlightId,
          x: anchorRight,
          y: minTop,
        });
      }
    });

    setBadges(calculated);
  }, [notes]);

  useEffect(() => {
    updateBadges();

    const handleScrollOrResize = () => {
      // Immediately dismiss preview on scroll to avoid out-of-sync floating
      updateActivePreview(null);
      clearHideTimer();
      updateBadges();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    const observer = new MutationObserver(() => {
      updateBadges();
    });

    const target = document.querySelector(".bookgarden-viewer-scroll") || document.body;
    observer.observe(target, { childList: true, subtree: true });

    const interval = setInterval(updateBadges, 800);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
      observer.disconnect();
      clearInterval(interval);
      clearHideTimer();
    };
  }, [updateBadges, clearHideTimer, updateActivePreview]);

  // Handle auto-display on hover over highlight text or badge
  useEffect(() => {
    if (clickedHighlightId || activeNote) {
      updateActivePreview(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If hovering inside the tooltip itself, keep it open
      if (tooltipRef.current?.contains(target)) {
        isOverTooltipRef.current = true;
        clearHideTimer();
        return;
      }

      // Check if hovering over a highlight element or note indicator badge
      const badgeEl = target.closest<HTMLElement>("[data-note-indicator-badge]");
      const highlightEl = target.closest<HTMLElement>("[data-highlight-id]");

      const highlightId =
        badgeEl?.dataset.noteIndicatorBadge ||
        highlightEl?.dataset.highlightId;

      if (!highlightId) {
        if (!isOverTooltipRef.current) {
          scheduleHide();
        }
        return;
      }

      // If already displaying for this specific highlight, stay stably anchored
      if (activePreviewRef.current?.highlightId === highlightId) {
        clearHideTimer();
        return;
      }

      const attachedNote = notes.find(
        (n) =>
          n.target.type === "highlight" &&
          n.target.highlightId === highlightId &&
          n.bodyMarkdown?.trim().length > 0,
      );

      if (!attachedNote) {
        scheduleHide();
        return;
      }

      clearHideTimer();

      // Find top-right anchor coordinate of the entire highlight
      const allHighlightEls = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-highlight-id="${highlightId}"]`),
      );

      const rects = allHighlightEls
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);

      if (rects.length === 0) return;

      const minTop = Math.min(...rects.map((r) => r.top));
      const topRowRects = rects.filter((r) => Math.abs(r.top - minTop) < 8);
      const topRowRight = Math.max(...topRowRects.map((r) => r.right));
      const overallMaxRight = Math.max(...rects.map((r) => r.right));
      const anchorRight = Math.max(topRowRight, overallMaxRight);

      updateActivePreview({
        note: attachedNote,
        highlightId,
        x: anchorRight,
        y: minTop,
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (tooltipRef.current?.contains(related)) {
        isOverTooltipRef.current = true;
        clearHideTimer();
        return;
      }

      const relatedBadge = related?.closest<HTMLElement>("[data-note-indicator-badge]");
      const relatedHighlight = related?.closest<HTMLElement>("[data-highlight-id]");
      const relatedId =
        relatedBadge?.dataset.noteIndicatorBadge ||
        relatedHighlight?.dataset.highlightId;

      // If moving between elements/lines of the exact same highlight, do not hide
      if (relatedId === activePreviewRef.current?.highlightId) {
        clearHideTimer();
        return;
      }

      scheduleHide();
    };

    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      clearHideTimer();
    };
  }, [notes, clickedHighlightId, activeNote, clearHideTimer, scheduleHide, updateActivePreview]);

  const handleBadgeClick = (badge: NoteBadge) => {
    clearHideTimer();
    if (activePreview?.highlightId === badge.highlightId) {
      updateActivePreview(null);
    } else {
      updateActivePreview(badge);
    }
  };

  const handleEditClick = (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    updateActivePreview(null);
    onEditNote?.(highlightId);
  };

  const themeClasses = {
    light: {
      card: "bg-white text-slate-800 border-slate-200 shadow-xl shadow-slate-900/10",
      header: "border-slate-100 text-slate-500",
      badgeText: "text-amber-700",
      arrow: "bg-white border-slate-200",
      body: "text-slate-800",
      editBtn: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    },
    dark: {
      card: "bg-[#1e2227]/95 text-slate-100 border-slate-700/80 shadow-2xl shadow-black/50 backdrop-blur-md",
      header: "border-slate-700/60 text-slate-400",
      badgeText: "text-amber-400",
      arrow: "bg-[#1e2227]/95 border-slate-700/80",
      body: "text-slate-200",
      editBtn: "text-slate-300 hover:text-white hover:bg-white/10",
    },
    sepia: {
      card: "bg-[#fbf0d9] text-[#5b4636] border-[#dfd3b9] shadow-xl",
      header: "border-[#e8dcc3] text-[#8a725b]",
      badgeText: "text-[#8b5a2b]",
      arrow: "bg-[#fbf0d9] border-[#dfd3b9]",
      body: "text-[#382b21]",
      editBtn: "text-[#5b4636] hover:text-[#382b21] hover:bg-[#ede3cc]",
    },
  }[theme];

  // Tooltip geometry calculation anchored to top-right of highlight
  let tooltipPosition: {
    top: number;
    left: number;
    arrowPlacement: "left" | "bottom" | "top";
    arrowOffset: number;
    transform: string;
  } | null = null;

  if (activePreview) {
    const tooltipWidth = 270;
    const margin = 16;

    // Check if there is comfortable room to display to the right of the highlight
    const spaceOnRight = window.innerWidth - activePreview.x;
    const placeOnRight = spaceOnRight >= tooltipWidth + margin;

    if (placeOnRight) {
      // Float to the right of the highlight in the page margin/blank space
      const left = activePreview.x + 14;
      const top = Math.max(margin, Math.min(window.innerHeight - 180, activePreview.y - 8));
      const arrowOffset = Math.max(12, Math.min(100, activePreview.y - top + 4));

      tooltipPosition = {
        left,
        top,
        arrowPlacement: "left",
        arrowOffset,
        transform: "none",
      };
    } else {
      // Near right screen edge: float above (or below if <130px from top)
      const showBelow = activePreview.y < 130;
      const top = showBelow ? activePreview.y + 22 : activePreview.y - 10;
      let left = activePreview.x - tooltipWidth + 24;
      left = Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, left));
      const arrowOffset = Math.max(12, Math.min(tooltipWidth - 20, activePreview.x - left - 6));

      tooltipPosition = {
        left,
        top,
        arrowPlacement: showBelow ? "top" : "bottom",
        arrowOffset,
        transform: showBelow ? "none" : "translateY(-100%)",
      };
    }
  }

  return (
    <>
      {/* 1. Subtle Note Indicator Icon at Top-Right of each Highlight with a Note */}
      {badges.map((b) => (
        <button
          key={b.highlightId}
          type="button"
          data-note-indicator-badge={b.highlightId}
          aria-label="Attached note"
          title="Attached note (hover or click to view)"
          onClick={(e) => {
            e.stopPropagation();
            handleBadgeClick(b);
          }}
          onMouseEnter={() => {
            clearHideTimer();
            updateActivePreview(b);
          }}
          onMouseLeave={scheduleHide}
          style={{
            position: "fixed",
            left: `${b.x - 7}px`,
            top: `${b.y - 9}px`,
            zIndex: 40,
          }}
          className="w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-300 dark:bg-amber-500 dark:hover:bg-amber-400 text-amber-950 shadow-md ring-1 ring-amber-600/30 flex items-center justify-center cursor-pointer transition-transform hover:scale-125 active:scale-95 animate-in fade-in zoom-in-75 duration-150"
        >
          <StickyNote size={11} className="fill-current" />
        </button>
      ))}

      {/* 2. Note Preview Tooltip (auto-displayed on hover over highlight or badge) */}
      {activePreview && tooltipPosition && (
        <div
          ref={tooltipRef}
          onMouseEnter={() => {
            isOverTooltipRef.current = true;
            clearHideTimer();
          }}
          onMouseLeave={() => {
            isOverTooltipRef.current = false;
            scheduleHide();
          }}
          style={{
            position: "fixed",
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: "270px",
            transform: tooltipPosition.transform,
            zIndex: 60,
          }}
          className={`relative border rounded-xl p-3 text-xs transition-opacity duration-150 animate-in fade-in zoom-in-95 pointer-events-auto select-text ${themeClasses.card}`}
        >
          {/* Pointer Arrow */}
          {tooltipPosition.arrowPlacement === "left" && (
            <div
              style={{ top: `${tooltipPosition.arrowOffset}px` }}
              className={`absolute -left-1.5 w-3 h-3 border-l border-b rotate-45 pointer-events-none ${themeClasses.arrow}`}
            />
          )}
          {tooltipPosition.arrowPlacement === "bottom" && (
            <div
              style={{ left: `${tooltipPosition.arrowOffset}px` }}
              className={`absolute -bottom-1.5 w-3 h-3 border-r border-b rotate-45 pointer-events-none ${themeClasses.arrow}`}
            />
          )}
          {tooltipPosition.arrowPlacement === "top" && (
            <div
              style={{ left: `${tooltipPosition.arrowOffset}px` }}
              className={`absolute -top-1.5 w-3 h-3 border-l border-t rotate-45 pointer-events-none ${themeClasses.arrow}`}
            />
          )}

          {/* Header with Note Icon, Label & Edit Button */}
          <div
            className={`flex items-center justify-between pb-1.5 mb-1.5 border-b ${themeClasses.header}`}
          >
            <div
              className={`flex items-center gap-1.5 font-semibold text-[11px] ${themeClasses.badgeText}`}
            >
              <StickyNote size={13} className="fill-current" />
              <span>Attached Note</span>
            </div>
            {onEditNote && (
              <button
                type="button"
                onClick={(e) => handleEditClick(e, activePreview.highlightId)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer text-[10px] font-medium ${themeClasses.editBtn}`}
                title="Edit this note"
              >
                <Edit3 size={11} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Note Body Content */}
          <div
            className={`text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-words no-scrollbar ${themeClasses.body}`}
          >
            {activePreview.note.bodyMarkdown}
          </div>
        </div>
      )}
    </>
  );
}
