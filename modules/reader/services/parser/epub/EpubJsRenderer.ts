import ePub, { Book, Rendition, Location } from "epubjs";
import { ReaderRenderer } from "../../../application/ports/ReaderRenderer";
import {
  LocationAnchor,
  SelectionAnchor,
  ReaderHighlight,
} from "@/shared/core/events/types";
import { ReaderPreferencesDto } from "../../../application/dto/ReaderPageDto";
import { useReaderStore, SelectionRect } from "../../../state/reader-store";
import { sanitizeEpubDocument, isolateEpubIframe } from "./epub-sanitizer";

interface EpubContents {
  document?: Document;
  window?: Window;
}

interface EpubDocumentLocation {
  start: { cfi: string };
  end?: { cfi: string };
}

interface EpubSpineItem {
  load: (loadFn: unknown) => Promise<unknown>;
  find: (query: string) => Promise<unknown[]>;
  unload: () => Promise<unknown>;
}

interface EpubSpine {
  spineItems: EpubSpineItem[];
}

export class EpubJsRenderer implements ReaderRenderer {
  private book: Book | null = null;
  private rendition: Rendition | null = null;

  private locationListeners: Set<
    (anchor: LocationAnchor, percentage: number) => void
  > = new Set();
  private selectionListeners: Set<
    (anchor: SelectionAnchor, text: string, rect?: SelectionRect) => void
  > = new Set();
  private highlightClickListeners: Set<(id: string) => void> = new Set();

  private handleRelocated = (location: Location) => {
    const anchor: LocationAnchor = {
      type: "epubcfi",
      value: location.start.cfi,
    };

    // epubjs location has a percentage property if locations are generated
    const percentage = this.book?.locations
      ? this.book.locations.percentageFromCfi(location.start.cfi)
      : 0;

    this.locationListeners.forEach((listener) =>
      listener(anchor, percentage * 100),
    );
  };

  private handleSelected = (cfiRange: string, contents: any) => {
    const iframeWindow = contents.window;
    const text = iframeWindow.getSelection().toString();
    const anchor: SelectionAnchor = {
      version: 1,
      start: { type: "epubcfi", value: cfiRange },
      end: { type: "epubcfi", value: cfiRange },
    };

    // Transform iframe-local Range geometry to parent viewport coordinates.
    // EPUB.js renders inside an iframe, so range.getBoundingClientRect()
    // returns coordinates relative to the iframe document viewport.
    // We must offset by the iframe's own bounding rect to produce
    // parent-viewport-relative SelectionRect.
    let rect: SelectionRect | undefined;
    try {
      const sel = iframeWindow.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const iframeRect = range.getBoundingClientRect();
        if (iframeRect.width > 0 && iframeRect.height > 0) {
          // Find the iframe element in the parent document
          const iframeEl = contents.document?.defaultView?.frameElement as HTMLIFrameElement | null;
          if (iframeEl) {
            const iframeBounds = iframeEl.getBoundingClientRect();
            rect = {
              top: iframeRect.top + iframeBounds.top,
              left: iframeRect.left + iframeBounds.left,
              width: iframeRect.width,
              height: iframeRect.height,
              bottom: iframeRect.bottom + iframeBounds.top,
              right: iframeRect.right + iframeBounds.left,
            };
          } else {
            // Fallback: use iframe-local coordinates directly
            rect = {
              top: iframeRect.top,
              left: iframeRect.left,
              width: iframeRect.width,
              height: iframeRect.height,
              bottom: iframeRect.bottom,
              right: iframeRect.right,
            };
          }
        }
      }
    } catch {
      // Range geometry unavailable; popup falls back to static positioning
    }

    this.selectionListeners.forEach((listener) => listener(anchor, text, rect));
    iframeWindow.getSelection().removeAllRanges();
  };

  async initialize(bookUrl: string, container: HTMLElement): Promise<void> {
    this.book = ePub(bookUrl);

    this.rendition = this.book.renderTo(container, {
      width: "100%",
      height: "100%",
      spread: "none",
      manager: "continuous",
      flow: "scrolled", // Can be overridden by preferences
    });

    // Register defensive content hook to sanitize hostile EPUB markup before render
    this.rendition.hooks.content.register((contents: EpubContents) => {
      try {
        if (contents?.document) {
          sanitizeEpubDocument(contents.document);
        }
        const iframe = container.querySelector("iframe");
        if (iframe) {
          isolateEpubIframe(iframe, contents?.window);
        }
      } catch (err) {
        console.warn("[EpubJsRenderer] Error applying hostile content sanitization:", err);
      }
    });

    this.rendition.on("relocated", this.handleRelocated);
    this.rendition.on("selected", this.handleSelected);

    // Generate locations for progress tracking
    await this.book.ready;
    await this.book.locations.generate(1600);
  }

  async display(): Promise<void> {
    if (!this.rendition) return;
    await this.rendition.display();
  }

  async goTo(anchor: LocationAnchor | string): Promise<void> {
    if (!this.rendition) return;
    const value = typeof anchor === "string" ? anchor : anchor.value;
    await this.rendition.display(value);
  }

  async next(): Promise<void> {
    if (!this.rendition) return;
    await this.rendition.next();
  }

  async previous(): Promise<void> {
    if (!this.rendition) return;
    await this.rendition.prev();
  }

  async getProgress(): Promise<{ percentage: number; anchor: LocationAnchor }> {
    if (!this.rendition || !this.book)
      throw new Error("Renderer not initialized");
    const location = (this.rendition.currentLocation() as unknown) as EpubDocumentLocation | undefined;
    const cfi = location?.start?.cfi || "";
    const percentage = this.book.locations && cfi
      ? this.book.locations.percentageFromCfi(cfi)
      : 0;
    return {
      percentage: percentage * 100,
      anchor: { type: "epubcfi", value: cfi },
    };
  }

  onLocationChanged(
    callback: (anchor: LocationAnchor, percentage: number) => void,
  ): () => void {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }

  async highlight(highlight: ReaderHighlight): Promise<void> {
    if (!this.rendition) return;
    const cfiRange = highlight.selectionAnchor.start.value;
    this.highlightIdToCfi.set(highlight.id, cfiRange);

    this.rendition.annotations.highlight(
      cfiRange,
      { fill: highlight.color },
      (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.highlightClickListeners.forEach((listener) =>
          listener(highlight.id),
        );
      },
      "highlight",
      { "data-highlight-id": highlight.id },
    );
  }

  async removeHighlight(id: string): Promise<void> {
    if (!this.rendition) return;
    const cfiRange = this.highlightIdToCfi.get(id);
    if (cfiRange) {
      this.rendition.annotations.remove(cfiRange, "highlight");
      this.highlightIdToCfi.delete(id);
    }
  }

  private highlightIdToCfi: Map<string, string> = new Map();

  onTextSelected(
    callback: (anchor: SelectionAnchor, text: string, rect?: SelectionRect) => void,
  ): () => void {
    this.selectionListeners.add(callback);
    return () => this.selectionListeners.delete(callback);
  }

  onHighlightClicked(callback: (id: string) => void): () => void {
    this.highlightClickListeners.add(callback);
    return () => this.highlightClickListeners.delete(callback);
  }

  async bookmark(anchor: LocationAnchor): Promise<void> {
    // Optional visual rendering of bookmark
    if (!this.rendition) return;
    // epubjs doesn't have a native "bookmark" annotation out of the box like highlight,
    // so we could render a custom mark if needed.
  }

  async annotation(id: string, action: "show" | "hide"): Promise<void> {
    // Show/hide note icon or popup next to highlight
  }

  async search(query: string): Promise<unknown[]> {
    if (!this.book) return [];

    const spine = (this.book.spine as unknown) as EpubSpine | undefined;
    if (!spine || !Array.isArray(spine.spineItems)) return [];

    const searchPromises = spine.spineItems.map((item) =>
      item
        .load(this.book!.load.bind(this.book))
        .then(() => item.find(query))
        .finally(() => item.unload()),
    );

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  theme(themeName: "light" | "dark" | "sepia"): void {
    if (!this.rendition) return;
    const themes = this.rendition.themes;
    themes.register("light", {
      body: {
        background: "#ffffff",
        color: "#000000",
        padding: "36px 48px !important",
        "max-width": "860px !important",
        margin: "0 auto !important",
        "box-sizing": "border-box !important",
      },
    });
    themes.register("dark", {
      body: {
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "36px 48px !important",
        "max-width": "860px !important",
        margin: "0 auto !important",
        "box-sizing": "border-box !important",
      },
    });
    themes.register("sepia", {
      body: {
        background: "#f4ecd8",
        color: "#5b4636",
        padding: "36px 48px !important",
        "max-width": "860px !important",
        margin: "0 auto !important",
        "box-sizing": "border-box !important",
      },
    });
    themes.select(themeName);
  }

  preferences(prefs: ReaderPreferencesDto): void {
    if (!this.rendition) return;
    const themes = this.rendition.themes;
    themes.fontSize(`${prefs.fontSize}px`);
    themes.font(prefs.fontFamily);

    // Convert line height and margin
    themes.override("line-height", `${prefs.lineHeight}`);
    themes.override("padding", `0 ${prefs.margin}px`);
  }

  async destroy(): Promise<void> {
    this.locationListeners.clear();
    this.selectionListeners.clear();
    this.highlightClickListeners.clear();
    this.highlightIdToCfi.clear();

    if (this.rendition) {
      this.rendition.off("relocated", this.handleRelocated);
      this.rendition.off("selected", this.handleSelected);
      this.rendition.destroy();
      this.rendition = null;
    }
    if (this.book) {
      this.book.destroy();
      this.book = null;
    }
  }
}
