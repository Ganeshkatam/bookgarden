import * as pdfjsLib from "pdfjs-dist";

/**
 * Centralized, defensive PDF.js configuration.
 * Enforces local self-hosted worker, cmaps, and standard fonts,
 * and explicitly disables executable JavaScript, XFA forms, and eval features.
 */

const LOCAL_PDFJS_WORKER_PATH = "/pdfjs/pdf.worker.min.mjs";
const LOCAL_CMAPS_PATH = "/pdfjs/cmaps/";
const LOCAL_STANDARD_FONTS_PATH = "/pdfjs/standard_fonts/";

let isConfigured = false;

export function configurePdfJs(): void {
  if (isConfigured) return;

  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_PDFJS_WORKER_PATH;
    isConfigured = true;
  }
}

export interface PdfDocumentSource {
  data?: Uint8Array;
  url?: string;
}

export interface DefensivePdfDocumentOptions {
  data?: Uint8Array;
  url?: string;
  cMapUrl: string;
  cMapPacked: boolean;
  standardFontDataUrl: string;
  enableScripting: boolean;
  isEvalSupported: boolean;
  enableXfa: boolean;
  stopAtErrors: boolean;
}

export function getPdfJsDocumentOptions(
  source: PdfDocumentSource,
): DefensivePdfDocumentOptions {
  configurePdfJs();

  return {
    ...source,
    cMapUrl: LOCAL_CMAPS_PATH,
    cMapPacked: true,
    standardFontDataUrl: LOCAL_STANDARD_FONTS_PATH,
    // Critical security controls: strictly disallow embedded scripting, eval, and XFA forms
    enableScripting: false,
    isEvalSupported: false,
    enableXfa: false,
    stopAtErrors: true,
  };
}
