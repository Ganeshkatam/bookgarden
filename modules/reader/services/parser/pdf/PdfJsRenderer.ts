import * as pdfjsLib from "pdfjs-dist";
import { ReaderRenderer } from "../../../application/ports/ReaderRenderer";
import {
  LocationAnchor,
  SelectionAnchor,
  ReaderHighlight,
} from "@/shared/core/events/types";
import { ReaderPreferencesDto } from "../../../application/dto/ReaderPageDto";
import { useReaderStore, SelectionRect } from "../../../state/reader-store";

if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type PageState = {
  wrapper: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  page: pdfjsLib.PDFPageProxy | null;
  renderTask: pdfjsLib.RenderTask | null;
  loadPromise: Promise<void> | null;
  generation: number;
  renderedZoom: number | null;
  isIntersecting: boolean;
};

const PAGE_CLASS = "bookgarden-pdf-page";
const PAGE_PLACEHOLDER_CLASS = "bookgarden-pdf-page-placeholder";
const VIRTUALIZATION_ROOT_MARGIN = "250% 0px";
const MAX_RENDERED_PAGES = 18;
const MAX_DEVICE_PIXEL_RATIO = 2;

export class PdfJsRenderer implements ReaderRenderer {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
  private container: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private scrollRaf: number | null = null;
  private budgetTimer: any = null;
  private pageStates = new Map<number, PageState>();

  private currentPageNum = 1;
  private totalPages = 1;
  private currentZoom = 1;
  private currentTheme: "light" | "dark" | "sepia" = "light";
  private initialized = false;
  private destroyed = false;
  private isNavigating = false;
  private navigatingTimer: any = null;
  private navigationTicket = 0;
  private pendingTargetPage: number | null = null;
  private lastEmittedPage = 0;
  private documentGeneration = 0;
  private placeholderRatio = 8.5 / 11;

  private locationListeners: Set<
    (anchor: LocationAnchor, percentage: number) => void
  > = new Set();

  private selectionListeners: Set<
    (anchor: SelectionAnchor, text: string, rect?: SelectionRect) => void
  > = new Set();
  private highlightClickListeners: Set<(id: string) => void> = new Set();
  private highlightsMap: Map<string, ReaderHighlight> = new Map();
  private handleDocumentMouseUp: (() => void) | null = null;
  private handleDocumentTouchEnd: (() => void) | null = null;

  async initialize(bookUrl: string, container: HTMLElement): Promise<void> {
    await this.destroy();

    this.destroyed = false;
    this.initialized = false;
    this.documentGeneration += 1;
    const generation = this.documentGeneration;
    this.container = container;
    this.currentPageNum = 1;
    this.lastEmittedPage = 0;

    // Reset container DOM tree and configure root scrolling properties
    container.replaceChildren();
    container.style.overflowY = "auto";
    container.style.overflowX = "hidden";
    container.style.display = "block";
    container.style.width = "100%";
    container.style.height = "100%";
    // Zero left/right padding to allow 100% full-width span with bottom scroll breathing room
    container.style.padding = "16px 0px 16px 0px";
    container.style.boxSizing = "border-box";
    container.style.scrollBehavior = "auto";
    container.style.overscrollBehavior = "contain";
    container.style.touchAction = "pan-y";
    (container.style as any).webkitOverflowScrolling = "touch";
    container.classList.add("bookgarden-pdf-scroll-container");

    const safeUrl = bookUrl.startsWith("http")
      ? encodeURI(decodeURI(bookUrl.trim()))
      : bookUrl.trim();

    const loadingTask = pdfjsLib.getDocument({
      url: safeUrl,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    });
    this.loadingTask = loadingTask;
    const pdfDocument = await loadingTask.promise;

    if (generation !== this.documentGeneration || this.destroyed) {
      await (pdfDocument as any).destroy?.();
      return;
    }

    this.pdfDocument = pdfDocument;
    this.totalPages = Math.max(1, pdfDocument.numPages);
    useReaderStore.getState().setTotalPages(this.totalPages);

    // Extract authentic embedded Table of Contents
    void this.extractTableOfContents(pdfDocument).then((toc) => {
      if (!this.destroyed) {
        useReaderStore.getState().setTableOfContents(toc);
      }
    });

    await this.createPageScaffolding(generation);
    if (generation !== this.documentGeneration || this.destroyed) return;

    this.installObservers();
    this.initialized = true;
    await this.ensurePageRendered(1);
    this.emitLocation(1);
  }

  private async extractTableOfContents(
    pdfDocument: pdfjsLib.PDFDocumentProxy,
  ): Promise<any[]> {
    try {
      const outline = await pdfDocument.getOutline();
      if (!outline || outline.length === 0) {
        return [];
      }

      const resolveItem = async (item: any): Promise<any | null> => {
        let pageNumber = 1;
        try {
          let dest = item.dest;
          if (typeof dest === "string") {
            dest = await pdfDocument.getDestination(dest);
          }
          if (Array.isArray(dest) && dest[0]) {
            const pageIndex = await pdfDocument.getPageIndex(dest[0]);
            pageNumber = pageIndex + 1;
          } else if (typeof dest === "number") {
            pageNumber = dest + 1;
          }
        } catch {
          pageNumber = 1;
        }

        const subItems: any[] = [];
        if (Array.isArray(item.items) && item.items.length > 0) {
          for (const sub of item.items) {
            const resolvedSub = await resolveItem(sub);
            if (resolvedSub) subItems.push(resolvedSub);
          }
        }

        return {
          id: Math.random().toString(36).substring(2, 9),
          title: (item.title || "Section").trim(),
          pageNumber: Math.max(1, Math.min(pageNumber, this.totalPages)),
          items: subItems.length > 0 ? subItems : undefined,
        };
      };

      const results: any[] = [];
      for (const item of outline) {
        const resolved = await resolveItem(item);
        if (resolved) results.push(resolved);
      }
      return results;
    } catch (err) {
      console.warn("Could not extract PDF outline:", err);
      return [];
    }
  }

  async display(): Promise<void> {
    if (!this.initialized || !this.pdfDocument) return;
    await this.ensurePageRendered(this.currentPageNum);
  }

  private async createPageScaffolding(generation: number): Promise<void> {
    const container = this.container;
    const pdfDocument = this.pdfDocument;
    if (!container || !pdfDocument || generation !== this.documentGeneration) return;

    const firstPage = await pdfDocument.getPage(1);
    if (generation !== this.documentGeneration || this.destroyed) {
      firstPage.cleanup();
      return;
    }

    const firstViewport = firstPage.getViewport({ scale: 1 });
    if (firstViewport.width > 0 && firstViewport.height > 0) {
      this.placeholderRatio = firstViewport.width / firstViewport.height;
    }
    firstPage.cleanup();

    const fragment = document.createDocumentFragment();
    for (let pageNumber = 1; pageNumber <= this.totalPages; pageNumber += 1) {
      const wrapper = document.createElement("div");
      wrapper.className = PAGE_CLASS;
      wrapper.dataset.pageNumber = String(pageNumber);
      wrapper.setAttribute("aria-label", `PDF page ${pageNumber}`);
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.minHeight = "320px";
      wrapper.style.aspectRatio = `${this.placeholderRatio}`;
      wrapper.style.display = "block";
      wrapper.style.textAlign = "center";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.margin = "0 0 24px 0";
      wrapper.style.contain = "layout style";
      wrapper.style.scrollMarginBlock = "16px";
      wrapper.classList.add(PAGE_PLACEHOLDER_CLASS);

      const state: PageState = {
        wrapper,
        canvas: null,
        page: null,
        renderTask: null,
        loadPromise: null,
        generation: 0,
        renderedZoom: null,
        isIntersecting: false,
      };
      this.pageStates.set(pageNumber, state);
      fragment.appendChild(wrapper);
    }
    container.appendChild(fragment);
  }

  private installObservers(): void {
    const container = this.container;
    if (!container) return;

    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        let hasNewIntersections = false;
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset.pageNumber);
          if (!Number.isInteger(pageNumber)) continue;
          
          const state = this.pageStates.get(pageNumber);
          if (state) state.isIntersecting = entry.isIntersecting;

          if (entry.isIntersecting) {
            hasNewIntersections = true;
            void this.ensurePageRendered(pageNumber);
          }
        }
        if (hasNewIntersections && !this.isNavigating) {
          this.scheduleEnforceBudget(this.currentPageNum);
        }
      },
      {
        root: container,
        rootMargin: VIRTUALIZATION_ROOT_MARGIN,
        threshold: 0.01,
      },
    );

    for (const state of this.pageStates.values()) {
      this.observer.observe(state.wrapper);
    }

    container.addEventListener("scroll", this.handleScroll, { passive: true });
    container.addEventListener("wheel", this.handleWheel, { passive: true });
    container.addEventListener("touchstart", this.handleTouchStart, { passive: true });
    container.addEventListener("touchmove", this.handleTouchMove, { passive: true });
    container.addEventListener("touchend", this.handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", this.handleTouchEnd, { passive: true });

    // Listen for text selections on rendered PDF pages.
    // We listen on document scope (not just the container) so that pointer
    // releases outside the page element still capture the active selection.
    const handleTextSelection = (): void => {
      // Small defer to let the browser finalize the Selection object
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          if (useReaderStore.getState().activeSelection) {
            useReaderStore.getState().setActiveSelection(null);
          }
          return;
        }

        const selectedText = sel.toString().trim();
        if (selectedText.length === 0) {
          if (useReaderStore.getState().activeSelection) {
            useReaderStore.getState().setActiveSelection(null);
          }
          return;
        }

        // Verify the selection originates within our container
        const range = sel.getRangeAt(0);
        const startNode = range.startContainer;
        const startEl = startNode instanceof Element ? startNode : startNode.parentElement;
        if (!startEl || !container.contains(startEl)) return;

        // Determine source page number from the selection anchor
        const wrapper = startEl.closest<HTMLElement>(`.${PAGE_CLASS}`);
        const pageNumber = wrapper?.dataset.pageNumber
          ? Number(wrapper.dataset.pageNumber)
          : this.currentPageNum;

        const anchor: SelectionAnchor = {
          version: 1,
          start: { type: "pdf", value: String(pageNumber) },
          end: { type: "pdf", value: String(pageNumber) },
        };

        // Derive ephemeral viewport geometry from the browser's actual Range
        let rect: SelectionRect | undefined;
        try {
          const domRect = range.getBoundingClientRect();
          if (domRect.width > 0 && domRect.height > 0) {
            rect = {
              top: domRect.top,
              left: domRect.left,
              width: domRect.width,
              height: domRect.height,
              bottom: domRect.bottom,
              right: domRect.right,
            };
          }
        } catch {
          // Range geometry unavailable; popup falls back to static positioning
        }

        this.selectionListeners.forEach((listener) =>
          listener(anchor, selectedText, rect),
        );
      }, 30);
    };

    // Document-level listeners ensure selection completion is captured
    // even when the pointer release occurs outside the page container.
    this.handleDocumentMouseUp = handleTextSelection;
    this.handleDocumentTouchEnd = handleTextSelection;
    document.addEventListener("mouseup", this.handleDocumentMouseUp);
    document.addEventListener("touchend", this.handleDocumentTouchEnd);
  }

  private initialPinchDistance = 0;
  private initialPinchZoom = 100;
  private isPinching = false;
  private pinchRaf: number | null = null;

  private readonly handleWheel = (e: WheelEvent): void => {
    // Detect trackpad pinch-to-zoom (dispatches ctrlKey + wheel event)
    if (e.ctrlKey) {
      e.preventDefault();
      const currentPct = Math.round(this.currentZoom * 100);
      const step = e.deltaY < 0 ? 5 : -5;
      const targetZoom = Math.min(300, Math.max(80, currentPct + step));
      if (targetZoom !== currentPct) {
        useReaderStore.getState().updatePreference("zoom", targetZoom);
        this.preferences({
          ...useReaderStore.getState().preferences,
          zoom: targetZoom,
        });
      }
    }
  };

  private readonly handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      this.isPinching = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialPinchDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY,
      );
      this.initialPinchZoom = Math.round(this.currentZoom * 100);
    }
  };

  private readonly handleTouchMove = (e: TouchEvent): void => {
    if (!this.isPinching || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY,
    );

    if (this.initialPinchDistance > 0) {
      const scaleFactor = currentDistance / this.initialPinchDistance;
      const rawTarget = Math.round(this.initialPinchZoom * scaleFactor);
      const targetZoom = Math.min(300, Math.max(80, rawTarget));

      if (this.pinchRaf !== null) {
        window.cancelAnimationFrame(this.pinchRaf);
      }

      this.pinchRaf = window.requestAnimationFrame(() => {
        this.pinchRaf = null;
        const currentPct = Math.round(this.currentZoom * 100);
        if (Math.abs(targetZoom - currentPct) >= 2) {
          useReaderStore.getState().updatePreference("zoom", targetZoom);
          this.preferences({
            ...useReaderStore.getState().preferences,
            zoom: targetZoom,
          });
        }
      });
    }
  };

  private readonly handleTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.isPinching = false;
      this.initialPinchDistance = 0;
      if (this.pinchRaf !== null) {
        window.cancelAnimationFrame(this.pinchRaf);
        this.pinchRaf = null;
      }
    }
  };

  private readonly handleScroll = (): void => {
    if (this.isNavigating) return;
    if (this.scrollRaf !== null) return;
    this.scrollRaf = window.requestAnimationFrame(() => {
      this.scrollRaf = null;
      if (!this.isNavigating) {
        this.updateCurrentPageFromViewport();
      }
    });
  };

  private updateCurrentPageFromViewport(): void {
    const container = this.container;
    if (!container || this.pageStates.size === 0) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    // Focus reading line at 35% from the top of the viewport
    const targetLine = scrollTop + viewportHeight * 0.35;

    let closestPage = this.currentPageNum;
    let closestDistance = Infinity;

    for (const [pageNumber, state] of this.pageStates) {
      const top = state.wrapper.offsetTop;
      const height = state.wrapper.offsetHeight || 320;

      if (targetLine >= top && targetLine <= top + height) {
        closestPage = pageNumber;
        break;
      }

      const middle = top + height / 2;
      const dist = Math.abs(middle - targetLine);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestPage = pageNumber;
      }
    }

    if (!Number.isInteger(closestPage) || closestPage < 1 || closestPage > this.totalPages) return;
    if (closestPage === this.currentPageNum) return;

    this.currentPageNum = closestPage;
    this.emitLocation(closestPage);
    this.scheduleEnforceBudget(closestPage);
  }

  private emitLocation(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.totalPages) return;
    if (pageNumber === this.lastEmittedPage) return;

    this.lastEmittedPage = pageNumber;
    const percentage = (pageNumber / Math.max(1, this.totalPages)) * 100;
    const anchor: LocationAnchor = {
      type: "pdf",
      value: String(pageNumber),
    };
    this.locationListeners.forEach((listener) => listener(anchor, percentage));
  }

  private async ensurePageRendered(pageNumber: number): Promise<void> {
    const pdfDocument = this.pdfDocument;
    const state = this.pageStates.get(pageNumber);
    if (!pdfDocument || !state || this.destroyed) return;

    if (state.canvas && state.renderedZoom === this.currentZoom) return;
    if (state.loadPromise) {
      await state.loadPromise;
      return;
    }

    const generation = ++state.generation;
    const zoom = this.currentZoom;
    state.loadPromise = this.renderPage(pageNumber, state, generation, zoom)
      .catch((error: unknown) => {
        if (!this.isCancellationError(error)) {
          console.error(`Failed to render PDF page ${pageNumber}`, error);
        }
      })
      .finally(() => {
        if (state.generation === generation) {
          state.loadPromise = null;
        }
      });

    await state.loadPromise;
  }

  private async renderPage(
    pageNumber: number,
    state: PageState,
    generation: number,
    zoom: number,
  ): Promise<void> {
    const pdfDocument = this.pdfDocument;
    if (!pdfDocument || this.destroyed) return;

    let page: pdfjsLib.PDFPageProxy;
    try {
      page = await pdfDocument.getPage(pageNumber);
    } catch (err: unknown) {
      if (this.destroyed || this.isCancellationError(err)) return;
      throw err;
    }

    if (!this.isCurrentPageState(state, generation)) {
      page.cleanup();
      return;
    }
    // 1. Calculate unscaled PDF page dimensions
    const unscaledViewport = page.getViewport({ scale: 1 });
    const containerWidth = Math.max(300, this.container?.clientWidth || window.innerWidth);
    const containerHeight = Math.max(300, (this.container?.clientHeight || window.innerHeight) - 40);

    // 2. Base Scale (fit vertically inside screen at 100%) & Max Scale (fit 100% of container width at 300%)
    const fitPageScale = Math.min(
      containerWidth / Math.max(1, unscaledViewport.width),
      containerHeight / Math.max(1, unscaledViewport.height),
    );
    const fitWidthScale = containerWidth / Math.max(1, unscaledViewport.width);

    // 3. Zoom-dependent scaling strictly clamped so it NEVER exceeds the viewport width (fitWidthScale)
    const z = (zoom && zoom > 5) ? zoom / 100 : (zoom || 1.0);
    let effectiveScale: number;

    if (z <= 1.0) {
      // 80% to 100%: Scales from overview down to 0.8x up to 1.0x fitPageScale
      effectiveScale = fitPageScale * Math.max(0.8, z);
    } else {
      // 100% to 300%: Scales smoothly from fitPageScale up to EXACTLY fitWidthScale
      const t = Math.min(1.0, (z - 1.0) / 2.0); // 0 at 100%, 1.0 at 300%
      effectiveScale = fitPageScale + (fitWidthScale - fitPageScale) * t;
    }

    // Hard ceiling: Scale can never exceed fitWidthScale under any circumstances
    effectiveScale = Math.min(fitWidthScale, Math.max(0.2, effectiveScale));

    const viewport = page.getViewport({ scale: effectiveScale });

    // 4. Device Pixel Ratio: Sharp high-DPI rendering capped at MAX_DEVICE_PIXEL_RATIO (2.0)
    const outputScale = Math.min(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      MAX_DEVICE_PIXEL_RATIO,
    );

    // 5. Canvas Element Setup: Backing buffer scaled to device pixels with strict maxWidth guard
    const canvas = document.createElement("canvas");
    canvas.className = "bookgarden-pdf-canvas";
    canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
    canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.style.maxWidth = "100%";
    canvas.style.boxSizing = "border-box";
    canvas.style.backgroundColor = "white";
    canvas.style.borderRadius = "4px";
    canvas.style.objectFit = "contain";
    canvas.style.userSelect = "none";
    canvas.setAttribute("aria-label", `Rendered PDF page ${pageNumber}`);

    // 6. Wrapper Layout: Display as centered flex container
    state.wrapper.style.display = "flex";
    state.wrapper.style.justifyContent = "center";
    state.wrapper.style.width = "100%";
    state.wrapper.style.maxWidth = "100%";
    state.wrapper.style.overflow = "visible";

    // 7. Acquire 2D Canvas Context and apply DPI transformation matrix
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      page.cleanup();
      this.restorePlaceholder(state);
      throw new Error("Unable to acquire a 2D canvas context");
    }

    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    // 8. Execute PDF.js async rendering pipeline
    const renderTask = page.render({
      canvasContext: context,
      viewport,
    } as any);
    state.renderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (error: unknown) {
      if (state.renderTask === renderTask) state.renderTask = null;
      // The canvas was never added to the DOM, so no need to remove it
      page.cleanup();
      throw error;
    }

    if (!this.isCurrentPageState(state, generation) || zoom !== this.currentZoom) {
      page.cleanup();
      return;
    }

    const pageContainer = document.createElement("div");
    pageContainer.className = "bookgarden-pdf-page-container";
    pageContainer.style.position = "relative";
    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;
    pageContainer.style.maxWidth = "100%";
    pageContainer.style.margin = "0 auto";
    pageContainer.style.borderRadius = "4px";
    pageContainer.style.boxShadow = "0 15px 35px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)";
    pageContainer.style.backgroundColor = "white";

    const filterStyles: Record<string, string> = {
      light: "none",
      dark: "invert(0.92) hue-rotate(180deg) contrast(0.92)",
      sepia: "sepia(0.35) contrast(0.95) brightness(0.95)",
    };
    pageContainer.style.filter = filterStyles[this.currentTheme] || "none";

    canvas.style.boxShadow = "none";
    pageContainer.appendChild(canvas);

    // Highlight overlay layer -- sits between canvas and text layer
    const highlightLayer = document.createElement("div");
    highlightLayer.className = "bookgarden-pdf-highlight-layer";
    highlightLayer.style.position = "absolute";
    highlightLayer.style.inset = "0";
    highlightLayer.style.pointerEvents = "none";
    highlightLayer.style.zIndex = "3";
    highlightLayer.style.overflow = "hidden";
    pageContainer.appendChild(highlightLayer);

    // Interactive Text Layer for selectable text, highlights, and note creation
    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "bookgarden-pdf-text-layer textLayer";
    textLayerDiv.style.position = "absolute";
    textLayerDiv.style.inset = "0";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    textLayerDiv.style.overflow = "clip";
    textLayerDiv.style.pointerEvents = "auto";
    textLayerDiv.style.userSelect = "none";
    textLayerDiv.style.zIndex = "5";
    // PDF.js 6.x mandatory CSS variables for sub-pixel text layer calibration
    textLayerDiv.style.setProperty("--scale-factor", String(viewport.scale));
    textLayerDiv.style.setProperty("--user-unit", "1");
    textLayerDiv.style.setProperty("--total-scale-factor", `calc(${viewport.scale} * var(--user-unit, 1))`);
    textLayerDiv.style.setProperty("--scale-round-x", "1px");
    textLayerDiv.style.setProperty("--scale-round-y", "1px");
    textLayerDiv.style.setProperty("--min-font-size", "1");
    pageContainer.appendChild(textLayerDiv);

    try {
      const textContent = await page.getTextContent();
      let rendered = false;

      if (typeof (pdfjsLib as any).TextLayer === "function") {
        try {
          const textLayer = new (pdfjsLib as any).TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
          rendered = textLayerDiv.children.length > 0;
        } catch (tlErr) {
          console.warn("pdfjs TextLayer error, falling back to calibrated glyph layer:", tlErr);
        }
      }

      if (!rendered) {
        textLayerDiv.innerHTML = "";
        const items = (textContent.items as any[]) || [];
        // Build all spans first without synchronous layout reads to avoid thrashing
        const deferredScaling: { span: HTMLSpanElement; targetWidth: number; angle: number }[] = [];
        for (const item of items) {
          if (!item.str) continue;
          const span = document.createElement("span");
          span.textContent = item.str;

          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]);
          const targetWidth = (item.width || 0) * viewport.scale;
          const angle = Math.atan2(tx[1], tx[0]);

          // PDF coordinate tx[5] is the font baseline. The transform matrix
          // maps PDF user-space to viewport-space with Y-axis flipped, so
          // tx[5] already accounts for the coordinate inversion. Position
          // the span top at (baseline - fontHeight) which places the full
          // glyph box correctly per the PDF page transform.
          span.style.position = "absolute";
          span.style.left = `${tx[4]}px`;
          span.style.top = `${tx[5] - fontHeight}px`;
          span.style.fontSize = `${fontHeight}px`;
          span.style.lineHeight = "1";
          span.style.fontFamily = item.fontName ? `"${item.fontName}", sans-serif` : "sans-serif";
          span.style.transformOrigin = "0% 0%";
          span.style.whiteSpace = "pre";
          span.style.color = "transparent";
          span.style.pointerEvents = "auto";
          span.style.userSelect = "text";
          span.style.webkitUserSelect = "text";

          textLayerDiv.appendChild(span);

          if (targetWidth > 0 && angle === 0) {
            deferredScaling.push({ span, targetWidth, angle });
          } else if (angle !== 0) {
            // Non-zero rotation: apply rotation transform immediately (no width measurement needed)
            span.style.transform = `rotate(${angle}rad)`;
            if (targetWidth > 0) {
              deferredScaling.push({ span, targetWidth, angle });
            }
          }
        }
        // Single layout read pass after all spans are in the DOM
        // This avoids N synchronous layout thrashes inside the span-creation loop
        if (deferredScaling.length > 0) {
          for (const { span, targetWidth, angle } of deferredScaling) {
            const actualWidth = span.getBoundingClientRect().width;
            if (actualWidth > 0) {
              const scaleX = targetWidth / actualWidth;
              if (Math.abs(scaleX - 1) > 0.01) {
                span.style.transform = angle !== 0
                  ? `rotate(${angle}rad) scaleX(${scaleX})`
                  : `scaleX(${scaleX})`;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Could not render text layer on page ${pageNumber}:`, err);
    }

    // Interactive PDF Hyperlinks & TOC Destinations Layer
    const linkLayer = document.createElement("div");
    linkLayer.className = "bookgarden-pdf-link-layer";
    linkLayer.style.position = "absolute";
    linkLayer.style.left = "0";
    linkLayer.style.top = "0";
    linkLayer.style.width = "100%";
    linkLayer.style.height = "100%";
    linkLayer.style.pointerEvents = "none";
    linkLayer.style.zIndex = "10";

    try {
      const annotations = await page.getAnnotations({ intent: "display" });
      for (const annot of annotations) {
        if (annot.subtype === "Link" && annot.rect) {
          const rect = (viewport as any).convertToViewportRectangle(annot.rect);
          const left = Math.min(rect[0], rect[2]);
          const top = Math.min(rect[1], rect[3]);
          const width = Math.abs(rect[2] - rect[0]);
          const height = Math.abs(rect[3] - rect[1]);

          const linkEl = document.createElement("a");
          linkEl.style.position = "absolute";
          linkEl.style.left = `${left}px`;
          linkEl.style.top = `${top}px`;
          linkEl.style.width = `${width}px`;
          linkEl.style.height = `${height}px`;
          linkEl.style.pointerEvents = "auto";
          linkEl.style.cursor = "pointer";
          linkEl.style.borderRadius = "2px";
          linkEl.className = "bookgarden-pdf-link hover:bg-indigo-500/15 hover:ring-1 hover:ring-indigo-500/30 transition-all";

          if (annot.url) {
            linkEl.href = annot.url;
            linkEl.target = "_blank";
            linkEl.rel = "noopener noreferrer";
            linkEl.title = annot.url;
          } else if (annot.dest) {
            linkEl.href = "#";
            linkEl.title = "Jump to section";
            linkEl.onclick = async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                let dest = annot.dest;
                if (typeof dest === "string") {
                  dest = await pdfDocument.getDestination(dest);
                }
                if (Array.isArray(dest) && dest[0]) {
                  const pageIndex = await pdfDocument.getPageIndex(dest[0]);
                  await this.goTo(String(pageIndex + 1));
                }
              } catch (err) {
                console.error("Failed to navigate to internal PDF destination:", err);
              }
            };
          }
          linkLayer.appendChild(linkEl);
        }
      }
    } catch (err) {
      console.warn("Could not load page annotations:", err);
    }

    pageContainer.appendChild(linkLayer);
    state.wrapper.replaceChildren(pageContainer);
    state.wrapper.style.aspectRatio = "auto";
    state.wrapper.style.minHeight = "0";
    state.wrapper.classList.remove(PAGE_PLACEHOLDER_CLASS);
    state.canvas = canvas;
    state.page = page;
    state.renderedZoom = zoom;
    state.renderTask = null;

    // Re-apply any existing highlights for this page on the text layer
    for (const h of this.highlightsMap.values()) {
      if (h.selectionAnchor?.start?.value === String(pageNumber)) {
        this.renderHighlightOnPage(h);
      }
    }

    this.enforceRenderBudget(this.currentPageNum);
  }

  private isCurrentPageState(state: PageState, generation: number): boolean {
    return !this.destroyed && state.generation === generation;
  }

  private async unloadPage(pageNumber: number, expectedGeneration?: number, keepCanvas = false): Promise<void> {
    const state = this.pageStates.get(pageNumber);
    if (!state) return;
    if (expectedGeneration !== undefined && state.generation !== expectedGeneration) return;

    state.generation += 1;
    const renderTask = state.renderTask;
    state.renderTask = null;

    if (renderTask) {
      renderTask.cancel();
      await renderTask.promise.catch(() => undefined);
    }

    const page = state.page;
    state.page = null;
    state.loadPromise = null;

    if (!keepCanvas) {
      state.renderedZoom = null;
      state.canvas?.remove();
      state.canvas = null;
      this.restorePlaceholder(state);
    }

    if (page) page.cleanup();
  }

  private restorePlaceholder(state: PageState): void {
    state.wrapper.classList.add(PAGE_PLACEHOLDER_CLASS);
    // Keep wrapper minHeight fixed to prevent scrollbar collapse and layout shift
    if (!state.wrapper.style.minHeight || state.wrapper.style.minHeight === "0px" || state.wrapper.style.minHeight === "0") {
      state.wrapper.style.aspectRatio = `${this.placeholderRatio}`;
      state.wrapper.style.minHeight = "320px";
    }
  }

  private scheduleEnforceBudget(centerPage: number): void {
    if (this.budgetTimer) clearTimeout(this.budgetTimer);
    this.budgetTimer = setTimeout(() => {
      this.enforceRenderBudget(centerPage);
    }, 450);
  }

  private enforceRenderBudget(centerPage: number): void {
    if (this.isNavigating) return;

    const rendered = [...this.pageStates.entries()]
      .filter(([, state]) => state.canvas !== null || state.loadPromise !== null)
      .sort(([pageA], [pageB]) => {
        const distanceA = Math.abs(pageA - centerPage);
        const distanceB = Math.abs(pageB - centerPage);
        return distanceA - distanceB;
      });

    for (const [pageNumber] of rendered.slice(MAX_RENDERED_PAGES)) {
      // Keep generous warm safety zone around active page (centerPage +/- 4 pages)
      if (Math.abs(pageNumber - centerPage) <= 4) continue;
      void this.unloadPage(pageNumber);
    }
  }

  async goTo(anchor: LocationAnchor | string): Promise<void> {
    if (!this.pdfDocument || !this.container) return;

    const rawPage = typeof anchor === "string" ? anchor : anchor.value;
    const targetPage = Number.parseInt(rawPage, 10);
    if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > this.totalPages) return;

    const ticket = ++this.navigationTicket;
    this.pendingTargetPage = targetPage;
    this.isNavigating = true;

    if (this.navigatingTimer) {
      clearTimeout(this.navigatingTimer);
      this.navigatingTimer = null;
    }

    this.currentPageNum = targetPage;
    this.emitLocation(targetPage);

    const state = this.pageStates.get(targetPage);
    if (!state) return;

    // Scroll immediately to target position to prevent animation pile-up during fast clicks
    const container = this.container;
    const targetTop = state.wrapper.offsetTop;
    container.scrollTo({
      top: Math.max(0, targetTop - 12),
      behavior: "auto",
    });

    // Pre-render target page
    await this.ensurePageRendered(targetPage);

    // If a newer navigation occurred while this page was rendering, abort old operation
    if (ticket !== this.navigationTicket || this.destroyed) {
      return;
    }

    // Warm up neighbors asynchronously
    if (targetPage + 1 <= this.totalPages) void this.ensurePageRendered(targetPage + 1);
    if (targetPage - 1 >= 1) void this.ensurePageRendered(targetPage - 1);

    this.navigatingTimer = setTimeout(() => {
      if (ticket === this.navigationTicket) {
        this.isNavigating = false;
        this.pendingTargetPage = null;
        this.enforceRenderBudget(targetPage);
      }
    }, 200);
  }

  async next(): Promise<void> {
    const basePage = this.pendingTargetPage ?? this.currentPageNum;
    const target = Math.min(this.totalPages, basePage + 1);
    if (target === basePage && target === this.currentPageNum) return;
    this.pendingTargetPage = target;
    await this.goTo(String(target));
  }

  async previous(): Promise<void> {
    const basePage = this.pendingTargetPage ?? this.currentPageNum;
    const target = Math.max(1, basePage - 1);
    if (target === basePage && target === this.currentPageNum) return;
    this.pendingTargetPage = target;
    await this.goTo(String(target));
  }

  async getProgress(): Promise<{ percentage: number; anchor: LocationAnchor }> {
    const page = Math.min(Math.max(this.currentPageNum, 1), this.totalPages);
    return {
      percentage: (page / Math.max(1, this.totalPages)) * 100,
      anchor: { type: "pdf", value: String(page) },
    };
  }

  async renderThumbnail(
    pageNumber: number,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    if (!this.pdfDocument || this.destroyed || pageNumber < 1 || pageNumber > this.totalPages)
      return;

    let page: pdfjsLib.PDFPageProxy | null = null;

    try {
      page = await this.pdfDocument.getPage(pageNumber);
      if (this.destroyed || !this.pdfDocument) {
        page.cleanup();
        return;
      }

      const unscaledViewport = page.getViewport({ scale: 1 });
      const targetWidth = 220;
      const scale = targetWidth / Math.max(1, unscaledViewport.width);
      const viewport = page.getViewport({ scale });

      const dpr =
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio || 1, 2)
          : 1;
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        page.cleanup();
        return;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({
        canvasContext: context,
        viewport,
      } as any).promise;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const isExpectedCancellation =
        /cancel/i.test(message) ||
        /worker was destroyed/i.test(message) ||
        this.destroyed;

      if (!isExpectedCancellation && process.env.NODE_ENV === "development") {
        console.warn(
          `[PdfJsRenderer] Handled thumbnail rendering error gracefully on page ${pageNumber}:`,
          message || err,
        );
      }

      // Draw a clean fallback representation on the canvas
      try {
        const context = canvas.getContext("2d");
        if (context && canvas.width > 0 && canvas.height > 0) {
          context.fillStyle = "#1e293b";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = "#94a3b8";
          context.font = "bold 10px monospace";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(`P.${pageNumber}`, canvas.width / 2, canvas.height / 2);
        }
      } catch {
        // Fallback canvas drawing failed silently
      }
    } finally {
      if (page) {
        try {
          page.cleanup();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  onLocationChanged(
    callback: (anchor: LocationAnchor, percentage: number) => void,
  ): () => void {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }

  private renderHighlightOnPage(highlight: ReaderHighlight): void {
    const pageNum = Number(highlight.selectionAnchor?.start?.value);
    if (!Number.isInteger(pageNum)) return;

    const state = this.pageStates.get(pageNum);
    if (!state?.wrapper) return;

    const pageContainer = state.wrapper.querySelector<HTMLDivElement>(
      ".bookgarden-pdf-page-container",
    );
    if (!pageContainer) return;

    const highlightLayer = pageContainer.querySelector<HTMLDivElement>(
      ".bookgarden-pdf-highlight-layer",
    );
    const textLayer = pageContainer.querySelector<HTMLDivElement>(
      ".bookgarden-pdf-text-layer",
    );
    if (!highlightLayer || !textLayer) return;

    // Clear previous overlay rects and span click handlers for this highlight
    highlightLayer.querySelectorAll(`[data-highlight-id="${highlight.id}"]`)
      .forEach((el) => el.remove());
    textLayer.querySelectorAll(`[data-highlight-id="${highlight.id}"]`)
      .forEach((el) => {
        el.removeAttribute("data-highlight-id");
        (el as HTMLElement).style.cursor = "";
        (el as HTMLElement).onclick = null;
      });

    const rawTarget = (highlight.selectedText || "").trim();
    if (!rawTarget) return;

    const spans = Array.from(textLayer.querySelectorAll<HTMLElement>("span"));
    if (spans.length === 0) return;

    const highlightBg = highlight.color.startsWith("#")
      ? `${highlight.color}A0`
      : "rgba(253, 224, 71, 0.63)";

    // Normalize text for fuzzy matching: lowercase, decompose ligatures/accents, strip punctuation and whitespace
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u2018\u2019`'\u201C\u201D"'\u2013\u2014\-–—]/g, "")
        .replace(/[^a-z0-9]/gi, "");

    const targetNorm = normalize(rawTarget);
    if (!targetNorm || targetNorm.length < 2) return;

    // Build a concatenated normalized string from all spans,
    // tracking which span each character belongs to
    const spanCharMap: number[] = []; // charIndex -> spanIndex
    let concat = "";

    for (let si = 0; si < spans.length; si++) {
      const raw = spans[si].textContent || "";
      const norm = normalize(raw);
      for (let ci = 0; ci < norm.length; ci++) {
        spanCharMap.push(si);
      }
      concat += norm;
    }

    // Find the target text within the concatenated span text
    let matchPos = concat.indexOf(targetNorm);
    let matchEnd = -1;

    if (matchPos !== -1) {
      matchEnd = matchPos + targetNorm.length - 1;
    } else {
      // Fallback: match by prefix and suffix for resilient paragraph matching
      const prefixLen = Math.min(20, targetNorm.length);
      const suffixLen = Math.min(20, targetNorm.length);
      const prefix = targetNorm.slice(0, prefixLen);
      const suffix = targetNorm.slice(Math.max(0, targetNorm.length - suffixLen));
      const pIdx = concat.indexOf(prefix);
      if (pIdx !== -1) {
        const sIdx = concat.lastIndexOf(suffix);
        if (sIdx !== -1 && sIdx + suffixLen > pIdx) {
          matchPos = pIdx;
          matchEnd = sIdx + suffixLen - 1;
        }
      }
    }

    if (matchPos === -1 || matchEnd === -1) return;

    const startIdx = spanCharMap[matchPos];
    const endIdx = spanCharMap[matchEnd];

    if (startIdx === undefined || endIdx === undefined) return;

    // Get the page container's bounding rect as coordinate origin
    const containerRect = pageContainer.getBoundingClientRect();

    // Collect bounding rects for all matched spans and tag them for click handling
    type SpanRect = { left: number; top: number; right: number; bottom: number };
    const rects: SpanRect[] = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const span = spans[i];
      if (!span.textContent || span.textContent.trim().length === 0) continue;

      // Tag the span for click handling only (no visual styling)
      span.dataset.highlightId = highlight.id;
      span.style.cursor = "pointer";
      span.onclick = (e) => {
        e.stopPropagation();
        this.highlightClickListeners.forEach((listener) =>
          listener(highlight.id),
        );
      };

      const sr = span.getBoundingClientRect();
      if (sr.width > 0 && sr.height > 0) {
        rects.push({
          left: sr.left - containerRect.left,
          top: sr.top - containerRect.top,
          right: sr.right - containerRect.left,
          bottom: sr.bottom - containerRect.top,
        });
      }
    }

    if (rects.length === 0) return;

    // Merge rects that are on the same line into single continuous highlight bars.
    // Use the median rect height as tolerance since spans on the same line have similar heights.
    const sortedHeights = rects.map((r) => r.bottom - r.top).sort((a, b) => a - b);
    const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)] || 16;
    const LINE_TOLERANCE = medianHeight * 0.6;
    const VERTICAL_PAD = 2;

    // Sort by top then left
    rects.sort((a, b) => a.top - b.top || a.left - b.left);

    const merged: SpanRect[] = [];
    let current = { ...rects[0] };

    for (let i = 1; i < rects.length; i++) {
      const r = rects[i];
      // Same line if vertical centers are close
      const currentMid = (current.top + current.bottom) / 2;
      const rMid = (r.top + r.bottom) / 2;
      if (Math.abs(currentMid - rMid) < LINE_TOLERANCE) {
        // Extend current line rect
        current.left = Math.min(current.left, r.left);
        current.right = Math.max(current.right, r.right);
        current.top = Math.min(current.top, r.top);
        current.bottom = Math.max(current.bottom, r.bottom);
      } else {
        merged.push(current);
        current = { ...r };
      }
    }
    merged.push(current);

    // Create one overlay div per merged line
    for (const rect of merged) {
      const overlay = document.createElement("div");
      overlay.dataset.highlightId = highlight.id;
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top - VERTICAL_PAD}px`;
      overlay.style.width = `${rect.right - rect.left}px`;
      overlay.style.height = `${rect.bottom - rect.top + VERTICAL_PAD * 2}px`;
      overlay.style.backgroundColor = highlightBg;
      overlay.style.borderRadius = "3px";
      overlay.style.pointerEvents = "none";

      highlightLayer.appendChild(overlay);
    }

    // If highlight has an attached note, render an indicator badge inside the highlight layer
    // so it scrolls with the page in 100% hardware-accelerated synchronization
    if (highlight.hasNote && merged.length > 0) {
      const topRect = merged[0];
      const maxRight = Math.max(...merged.map((r) => r.right));
      const rightAnchor = Math.max(topRect.right, maxRight);

      const badge = document.createElement("div");
      badge.dataset.noteIndicatorBadge = highlight.id;
      badge.dataset.highlightId = highlight.id;
      badge.className = "bookgarden-note-badge";
      badge.style.position = "absolute";
      badge.style.left = `${rightAnchor - 6}px`;
      badge.style.top = `${topRect.top - 8}px`;
      badge.style.width = "20px";
      badge.style.height = "20px";
      badge.style.borderRadius = "9999px";
      badge.style.backgroundColor = "#f59e0b"; // amber-500
      badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.cursor = "pointer";
      badge.style.pointerEvents = "auto";
      badge.style.zIndex = "10";
      badge.style.transition = "transform 0.15s ease";
      badge.title = "Attached note";

      badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="#78350f" stroke="#78350f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/></svg>`;

      badge.onmouseenter = () => {
        badge.style.transform = "scale(1.2)";
      };
      badge.onmouseleave = () => {
        badge.style.transform = "scale(1)";
      };

      highlightLayer.appendChild(badge);
    }
  }

  async highlight(highlight: ReaderHighlight): Promise<void> {
    this.highlightsMap.set(highlight.id, highlight);
    this.renderHighlightOnPage(highlight);
  }

  async removeHighlight(id: string): Promise<void> {
    this.highlightsMap.delete(id);
    // Remove overlay rectangles
    document.querySelectorAll(`.bookgarden-pdf-highlight-layer [data-highlight-id="${id}"]`)
      .forEach((el) => el.remove());
    // Remove click handlers from text spans
    document.querySelectorAll(`.bookgarden-pdf-text-layer [data-highlight-id="${id}"]`)
      .forEach((el) => {
        el.removeAttribute("data-highlight-id");
        (el as HTMLElement).style.cursor = "";
        (el as HTMLElement).onclick = null;
      });
  }

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
    void anchor;
  }

  async annotation(id: string, action: "show" | "hide"): Promise<void> {
    void id;
    void action;
  }

  async search(query: string): Promise<any[]> {
    void query;
    return [];
  }

  theme(themeName: "light" | "dark" | "sepia"): void {
    this.currentTheme = themeName;
    if (this.container) {
      const bgColors: Record<string, string> = {
        light: "#f1f5f9",
        dark: "#18191c",
        sepia: "#f4ecd8",
      };
      this.container.style.backgroundColor = bgColors[themeName] || bgColors.light;
    }

    const filterStyles: Record<string, string> = {
      light: "none",
      dark: "invert(0.92) hue-rotate(180deg) contrast(0.92)",
      sepia: "sepia(0.35) contrast(0.95) brightness(0.95)",
    };

    const filter = filterStyles[themeName] || "none";

    for (const state of this.pageStates.values()) {
      const pageContainer = state.wrapper.querySelector<HTMLElement>(".bookgarden-pdf-page-container");
      if (pageContainer) {
        pageContainer.style.filter = filter;
      } else if (state.canvas) {
        state.canvas.style.filter = filter;
      }
    }
  }

  private getMinZoom(): number {
    return 0.8; // Allow zooming out to 80%
  }

  preferences(prefs: ReaderPreferencesDto): void {
    const minZoom = this.getMinZoom();
    const newZoom = Math.max(minZoom, Math.min(3.0, (prefs.zoom || 100) / 100));
    if (this.currentZoom === newZoom) return;

    this.currentZoom = newZoom;
    const targetPage = this.currentPageNum;
    void this.resetRenderedPagesForZoom(targetPage);
  }

  private async resetRenderedPagesForZoom(targetPage: number): Promise<void> {
    const unloads: Promise<void>[] = [];
    for (const [pageNumber, state] of this.pageStates) {
      if (state.canvas || state.loadPromise) {
        // Keep the old canvas visible while rendering the new zoom to prevent a white flash
        const keepCanvas = state.isIntersecting || pageNumber === targetPage;
        unloads.push(this.unloadPage(pageNumber, undefined, keepCanvas));
      }
    }
    await Promise.all(unloads);
    
    if (!this.destroyed) {
      const reRenders: Promise<void>[] = [];
      for (const [pageNumber, state] of this.pageStates) {
        if (state.isIntersecting) {
          reRenders.push(this.ensurePageRendered(pageNumber));
        }
      }
      if (reRenders.length === 0) {
        reRenders.push(this.ensurePageRendered(targetPage));
      }
      await Promise.all(reRenders);
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.documentGeneration += 1;

    if (this.navigatingTimer) {
      clearTimeout(this.navigatingTimer);
      this.navigatingTimer = null;
    }
    this.isNavigating = false;

    if (this.scrollRaf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = null;
    }

    if (this.pinchRaf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.pinchRaf);
      this.pinchRaf = null;
    }

    this.container?.removeEventListener("scroll", this.handleScroll);
    this.container?.removeEventListener("wheel", this.handleWheel);
    this.container?.removeEventListener("touchstart", this.handleTouchStart);
    this.container?.removeEventListener("touchmove", this.handleTouchMove);
    this.container?.removeEventListener("touchend", this.handleTouchEnd);
    this.container?.removeEventListener("touchcancel", this.handleTouchEnd);

    if (this.handleDocumentMouseUp) {
      document.removeEventListener("mouseup", this.handleDocumentMouseUp);
      this.handleDocumentMouseUp = null;
    }
    if (this.handleDocumentTouchEnd) {
      document.removeEventListener("touchend", this.handleDocumentTouchEnd);
      this.handleDocumentTouchEnd = null;
    }

    this.observer?.disconnect();
    this.observer = null;

    const unloads = [...this.pageStates.keys()].map((pageNumber) => this.unloadPage(pageNumber));
    await Promise.all(unloads);
    this.pageStates.clear();
    this.highlightsMap.clear();

    if (this.loadingTask) {
      await this.loadingTask.destroy();
      this.loadingTask = null;
    }

    if (this.pdfDocument) {
      await (this.pdfDocument as any).destroy?.();
      this.pdfDocument = null;
    }

    this.container?.replaceChildren();
    this.container = null;
    this.initialized = false;
    this.currentPageNum = 1;
    this.totalPages = 1;
    this.lastEmittedPage = 0;
  }

  private isCancellationError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.name === "RenderingCancelledException" || 
        /cancel/i.test(error.message) ||
        /worker was destroyed/i.test(error.message) ||
        /transport destroyed/i.test(error.message) ||
        /document is closed/i.test(error.message) ||
        /cannot read properties of null/i.test(error.message)
      );
    }
    return false;
  }
}
