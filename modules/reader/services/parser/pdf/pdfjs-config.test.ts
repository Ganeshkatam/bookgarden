/**
 * @jest-environment jsdom
 */

import { getPdfJsDocumentOptions, configurePdfJs } from "./pdfjs-config";
import * as pdfjsLib from "pdfjs-dist";

describe("Centralized Defensive PDF.js Configuration", () => {
  it("1. Explicitly disables executable scripting and eval", () => {
    const opts = getPdfJsDocumentOptions({ url: "/sample.pdf" });

    expect(opts.enableScripting).toBe(false);
    expect(opts.isEvalSupported).toBe(false);
    expect(opts.stopAtErrors).toBe(true);
  });

  it("2. Binds worker to local self-hosted asset", () => {
    configurePdfJs();

    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe("/pdfjs/pdf.worker.min.mjs");
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).not.toContain("cdnjs.cloudflare.com");
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).not.toContain("unpkg.com");
  });

  it("3. Binds cmaps and standard fonts strictly to local self-hosted paths", () => {
    const opts = getPdfJsDocumentOptions({ url: "/sample.pdf" });

    expect(opts.cMapUrl).toBe("/pdfjs/cmaps/");
    expect(opts.cMapPacked).toBe(true);
    expect(opts.standardFontDataUrl).toBe("/pdfjs/standard_fonts/");

    expect(opts.cMapUrl).not.toContain("unpkg.com");
    expect(opts.standardFontDataUrl).not.toContain("unpkg.com");
  });
});
