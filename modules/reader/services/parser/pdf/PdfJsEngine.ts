import type {
  DocumentEngine,
  RenderedPage,
  TextContent,
  SearchResult,
  DocumentMetadata,
} from "@/modules/reader/application/ports/DocumentEngine";
import * as pdfjsLib from "pdfjs-dist";
import { getPdfJsDocumentOptions } from "./pdfjs-config";

export class PdfJsEngine implements DocumentEngine {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private pageCount: number = 0;
  private renderTasks: Set<pdfjsLib.RenderTask> = new Set(); // Track active renders for cleanup

  async load(buffer: ArrayBuffer): Promise<void> {
    // Destroy existing document if we are reloading
    await this.destroy();

    try {
      const loadingTask = pdfjsLib.getDocument(
        getPdfJsDocumentOptions({ data: new Uint8Array(buffer) }) as any,
      );
      this.pdfDocument = await loadingTask.promise;
      this.pageCount = this.pdfDocument.numPages;
      console.log(`PDF Loaded successfully. Total Pages: ${this.pageCount}`);
    } catch (error) {
      console.error("Failed to load PDF in PdfJsEngine", error);
      throw new Error("PDF Initialization failed");
    }
  }

  getPageCount(): number {
    return this.pageCount;
  }

  async getMetadata(): Promise<DocumentMetadata> {
    if (!this.pdfDocument) throw new Error("Document not loaded");

    const meta = await this.pdfDocument.getMetadata();
    const info = meta?.info as any;

    return {
      title: info?.Title || "Unknown PDF",
      author: info?.Author || "Unknown Author",
      totalPages: this.pageCount,
      engineType: "pdf",
    };
  }

  async renderPage(
    pageNumber: number,
    scale: number = 1.0,
  ): Promise<RenderedPage> {
    if (!this.pdfDocument) throw new Error("Document not loaded");
    if (pageNumber < 1 || pageNumber > this.pageCount)
      throw new Error("Page out of bounds");

    const page = await this.pdfDocument.getPage(pageNumber);

    // CSS pixels logic (viewport scale)
    const viewport = page.getViewport({ scale });

    // Use an offscreen canvas to prevent UI flicker and decouple the engine from the DOM
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context)
      throw new Error("Failed to acquire 2d context for PDF render");

    // Handle high-DPI displays (Retina screens)
    const outputScale =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderContext: any = {
      canvasContext: context,
      transform: transform,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);
    this.renderTasks.add(renderTask);

    try {
      await renderTask.promise;
    } finally {
      this.renderTasks.delete(renderTask);
    }

    return {
      pageNumber,
      canvas,
      width: viewport.width,
      height: viewport.height,
      scale,
    };
  }

  async getTextContent(pageNumber: number): Promise<TextContent> {
    if (!this.pdfDocument) throw new Error("Document not loaded");

    const page = await this.pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();

    // Map pdf.js native text content to our decoupled TextItem interface
    return {
      items: textContent.items.map((item: any) => ({
        str: item.str,
        dir: item.dir,
        width: item.width,
        height: item.height,
        transform: item.transform,
        fontName: item.fontName,
        hasEOL: item.hasEOL,
      })),
      styles: textContent.styles,
    };
  }

  async search(query: string): Promise<SearchResult[]> {
    // Implementation for native searching would require iterating pages.
    // For now, we return empty to fulfill contract.
    return [];
  }

  async destroy(): Promise<void> {
    //  CRITICAL MEMORY MANAGEMENT
    // Cancel all active rendering tasks to prevent memory leaks
    for (const task of this.renderTasks) {
      task.cancel();
    }
    this.renderTasks.clear();

    if (this.pdfDocument) {
      await (this.pdfDocument as any).destroy?.();
      this.pdfDocument = null;
    }
    this.pageCount = 0;
  }
}
