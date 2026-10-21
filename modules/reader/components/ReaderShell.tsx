"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Toolbar } from "./toolbar/Toolbar";
import { Viewer } from "./viewer/Viewer";
import { ReaderService } from "@/modules/reader/application/ReaderService";
import { HighlightPopup } from "./HighlightPopup";
import { HighlightContextMenu } from "./HighlightContextMenu";
import { NoteEditor } from "./NoteEditor";
import { NoteHoverTooltip } from "./NoteHoverTooltip";
import { useReaderStore } from "../state/reader-store";
import { AnnotationSidebar } from "./Sidebar/AnnotationSidebar";
import { PageSideRail } from "./Sidebar/PageSideRail";
import { ReaderPageDto } from "../application/dto/ReaderPageDto";
import { RendererFactory } from "../services/parser/RendererFactory";

interface ReaderShellProps {
  data: ReaderPageDto;
}

export function ReaderShell({ data }: ReaderShellProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<ReaderService | null>(null);
  const [service, setService] = useState<ReaderService | null>(null);

  const [accessError, setAccessError] = useState<string | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState<boolean>(true);

  const fetchSignedAccess = useCallback(async (): Promise<string> => {
    const res = await fetch(`/api/reader/books/${encodeURIComponent(data.book.id)}/access`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Access denied (${res.status})`);
    }
    const accessData = await res.json();
    if (!accessData.signedUrl) {
      throw new Error("No signed access URL returned from authorization service");
    }
    return accessData.signedUrl;
  }, [data.book.id]);

  const initReader = useCallback(async () => {
    if (!viewerRef.current) return;
    setIsLoadingAccess(true);
    setAccessError(null);

    try {
      const signedUrl = await fetchSignedAccess();

      const newService = new ReaderService(
        data.book.id,
        data.session,
        data.preferences,
      );
      serviceRef.current = newService;

      const renderer = RendererFactory.create(data.book.fileType);

      if (viewerRef.current) {
        await newService.initialize(
          renderer,
          signedUrl,
          viewerRef.current,
        );
        setService(newService);
        setIsLoadingAccess(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to secure reader access";
      const isExpectedTeardown =
        /worker was destroyed/i.test(message) ||
        /cancel/i.test(message);
      if (!isExpectedTeardown) {
        console.error("Failed to initialize Reader:", err);
        setAccessError(message);
      }
      setIsLoadingAccess(false);
    }
  }, [data.book.id, data.book.fileType, data.session, data.preferences, fetchSignedAccess]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      void initReader();
    }

    return () => {
      mounted = false;
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
        setService(null);
      }
    };
  }, [initReader]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!serviceRef.current) return;

      // Handle Zoom shortcuts (Ctrl/Cmd +/-/0 or bare +/-/0)
      if (
        e.key === "+" ||
        e.key === "=" ||
        e.key === "Add" ||
        ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+"))
      ) {
        e.preventDefault();
        serviceRef.current.zoomIn();
        return;
      }

      if (
        e.key === "-" ||
        e.key === "_" ||
        e.key === "Subtract" ||
        ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_"))
      ) {
        e.preventDefault();
        serviceRef.current.zoomOut();
        return;
      }

      if (
        e.key === "0" ||
        ((e.ctrlKey || e.metaKey) && e.key === "0")
      ) {
        e.preventDefault();
        serviceRef.current.resetZoom();
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "Space":
          e.preventDefault();
          serviceRef.current.next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          serviceRef.current.previous();
          break;
        case "Escape":
          useReaderStore.getState().setSidebarOpen(false);
          useReaderStore.getState().setActiveNote(null);
          useReaderStore.getState().setActiveSelection(null);
          useReaderStore.getState().setClickedHighlightId(null);
          break;
        case "b":
        case "B":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            serviceRef.current.toggleBookmark();
          }
          break;
        case "h":
        case "H":
          if (!e.ctrlKey && !e.metaKey) {
            const selection = useReaderStore.getState().activeSelection;
            if (selection) {
              e.preventDefault();
              serviceRef.current.createHighlight("#ffeb3b"); // default color
            }
          }
          break;
        case "f":
        case "F":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            useReaderStore.getState().setSidebarTab("search");
            useReaderStore.getState().setSidebarOpen(true);
          }
          break;
      }
    };

    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!serviceRef.current) return;
        if (e.deltaY < 0) {
          serviceRef.current.zoomIn();
        } else {
          serviceRef.current.zoomOut();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheelZoom);
    };
  }, []);

  // ─── Double Click / Tap to Zoom Toggle ────────────────────────────
  const handleDoubleClickViewer = useCallback((e: React.MouseEvent) => {
    // Only double click if not selecting text or clicking buttons
    if (window.getSelection()?.toString()) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;

    if (!serviceRef.current) return;
    const currentZoom = useReaderStore.getState().preferences.zoom || 100;
    if (currentZoom >= 140) {
      serviceRef.current.resetZoom();
    } else {
      serviceRef.current.setZoom(150);
    }
  }, []);

  // ─── Highlight callbacks ─────────────────────────────────────────
  const handleCreateHighlight = useCallback((color: string) => {
    serviceRef.current?.createHighlight(color);
  }, []);

  const handleDeleteHighlight = useCallback((highlightId: string) => {
    serviceRef.current?.deleteHighlight(highlightId);
  }, []);

  const handleHighlightAndNote = useCallback(async (color: string) => {
    const service = serviceRef.current;
    if (!service) return;
    await service.highlightSelectionAndOpenNote(color);
  }, []);

  // ─── Note callbacks ──────────────────────────────────────────────
  const handleAddNote = useCallback((highlightId: string) => {
    serviceRef.current?.openNoteForHighlight(highlightId);
  }, []);

  const handleSaveNote = useCallback((bodyMarkdown: string) => {
    serviceRef.current?.saveNote(bodyMarkdown);
  }, []);

  const handleCancelNote = useCallback(() => {
    useReaderStore.getState().setActiveNote(null);
  }, []);

  const theme = useReaderStore((state) => state.preferences.theme) || "light";

  const shellThemeClass = {
    light: "bg-slate-100 text-slate-800",
    dark: "bg-[#18191c] text-slate-100",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
  }[theme];

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors ${shellThemeClass}`}>
      <Toolbar
        service={service}
        bookTitle={data.book.title}
        fileType={data.book.fileType}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Collapsible Left Page Side Rail */}
        <PageSideRail service={service} />

        <main className="flex-1 relative" onDoubleClick={handleDoubleClickViewer}>
          {accessError ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-900/90 text-slate-100 backdrop-blur-sm">
              <div className="max-w-md p-6 rounded-xl border border-rose-500/30 bg-rose-950/40 text-center shadow-xl">
                <h3 className="text-lg font-semibold text-rose-400 mb-2">Book Access Unavailable</h3>
                <p className="text-sm text-slate-300 mb-5">{accessError}</p>
                <button
                  type="button"
                  onClick={() => void initReader()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors shadow"
                >
                  Retry Authorization
                </button>
              </div>
            </div>
          ) : (
            <Viewer ref={viewerRef} />
          )}
          <HighlightPopup
            onCreateHighlight={handleCreateHighlight}
            onHighlightAndNote={handleHighlightAndNote}
          />
          <HighlightContextMenu
            onAddNote={handleAddNote}
            onDeleteHighlight={handleDeleteHighlight}
          />
          <NoteHoverTooltip onEditNote={handleAddNote} />
          <NoteEditor onSave={handleSaveNote} onCancel={handleCancelNote} />
        </main>
        <AnnotationSidebar service={service} />
      </div>
    </div>
  );
}
