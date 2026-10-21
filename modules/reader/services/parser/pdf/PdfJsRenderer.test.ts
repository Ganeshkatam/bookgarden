import * as pdfjsLib from "pdfjs-dist";
import { PdfJsRenderer } from "./PdfJsRenderer";

type MockRenderTask = {
  promise: Promise<void>;
  cancel: jest.Mock<void, []>;
};

type MockPage = {
  cleanup: jest.Mock<void, []>;
  getViewport: jest.Mock<{ width: number; height: number }, [{ scale: number }]>;
  render: jest.Mock<MockRenderTask, [{ canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: any }]>;
};

const getDocumentMock = jest.mocked(pdfjsLib.getDocument);

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = jest.fn<void, [Element]>();
  readonly disconnect = jest.fn<void, []>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: Array<Partial<IntersectionObserverEntry> & { target: Element }>): void {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

function createPage(): MockPage {
  const renderTask: MockRenderTask = {
    promise: Promise.resolve(),
    cancel: jest.fn(),
  };

  return {
    cleanup: jest.fn(),
    getViewport: jest.fn(({ scale }: { scale: number }) => ({
      width: 800 * scale,
      height: 1100 * scale,
    })),
    render: jest.fn((_args: any) => renderTask),
  };
}

function createDocument(pageCount: number): {
  document: pdfjsLib.PDFDocumentProxy;
  pages: MockPage[];
} {
  const pages = Array.from({ length: pageCount }, createPage);
  const document = {
    numPages: pageCount,
    getPage: jest.fn(async (pageNumber: number) => pages[pageNumber - 1]),
    destroy: jest.fn(async () => undefined),
  } as unknown as pdfjsLib.PDFDocumentProxy;

  return { document, pages };
}

describe("PdfJsRenderer continuous scrolling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockIntersectionObserver.instances.length = 0;
    getDocumentMock.mockReset();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
    })) as any;
    getDocumentMock.mockReset();
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1,
    });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0)) as unknown as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("creates one placeholder wrapper per PDF page and renders only the initial page", async () => {
    const { document: pdfDoc, pages } = createDocument(500);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdfDoc), destroy: jest.fn() } as unknown as pdfjsLib.PDFDocumentLoadingTask);

    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 900 });
    document.body.appendChild(container);

    const renderer = new PdfJsRenderer();
    await renderer.initialize("book.pdf", container);

    expect(container.querySelectorAll(".bookgarden-pdf-page")).toHaveLength(500);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(pages[0].render).toHaveBeenCalledTimes(1);
    expect(pages[1].render).not.toHaveBeenCalled();
    expect(pages[499].render).not.toHaveBeenCalled();

    await renderer.destroy();
  });

  it("renders an intersecting page and releases it after leaving the virtualization window", async () => {
    const { document: pdfDoc, pages } = createDocument(6);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdfDoc), destroy: jest.fn() } as unknown as pdfjsLib.PDFDocumentLoadingTask);

    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 900 });
    document.body.appendChild(container);

    const renderer = new PdfJsRenderer();
    await renderer.initialize("book.pdf", container);

    const pageOne = container.querySelector<HTMLElement>('[data-page-number="1"]');
    expect(pageOne?.querySelector("canvas")).not.toBeNull();

    // Navigate to distant page 6 so page 1 is evicted by render budget
    await renderer.goTo("6");
    await new Promise((r) => setTimeout(r, 200));

    expect(pages[5].render).toHaveBeenCalled();
    expect(pages[0].cleanup).toHaveBeenCalled();

    await renderer.destroy();
  });

  it("goTo scrolls to the requested page and updates the persisted anchor", async () => {
    const { document: pdfDoc } = createDocument(3);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdfDoc), destroy: jest.fn() } as unknown as pdfjsLib.PDFDocumentLoadingTask);

    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 900 });
    document.body.appendChild(container);

    const renderer = new PdfJsRenderer();
    const locations: string[] = [];
    renderer.onLocationChanged((anchor) => locations.push(anchor.value));
    await renderer.initialize("book.pdf", container);

    const pageThree = container.querySelector<HTMLElement>('[data-page-number="3"]');
    if (!pageThree) throw new Error("page 3 wrapper was not created");

    await renderer.goTo("3");

    expect(locations).toContain("3");
    expect((await renderer.getProgress()).anchor.value).toBe("3");

    await renderer.destroy();
  });

  it("handles rapid consecutive next page navigation without regressing", async () => {
    const { document: pdfDoc } = createDocument(10);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdfDoc), destroy: jest.fn() } as unknown as pdfjsLib.PDFDocumentLoadingTask);

    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 900 });
    document.body.appendChild(container);

    const renderer = new PdfJsRenderer();
    const locations: string[] = [];
    renderer.onLocationChanged((anchor) => locations.push(anchor.value));
    await renderer.initialize("book.pdf", container);

    // Rapidly trigger next 5 times in milliseconds
    const p1 = renderer.next();
    const p2 = renderer.next();
    const p3 = renderer.next();
    const p4 = renderer.next();
    const p5 = renderer.next();

    await Promise.all([p1, p2, p3, p4, p5]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect((await renderer.getProgress()).anchor.value).toBe("6");
    expect(locations[locations.length - 1]).toBe("6");

    await renderer.destroy();
  });

  it("cancels old renders and re-renders the active page when zoom changes", async () => {
    const { document: pdfDoc, pages } = createDocument(2);
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdfDoc), destroy: jest.fn() } as unknown as pdfjsLib.PDFDocumentLoadingTask);

    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 900 });
    document.body.appendChild(container);

    const renderer = new PdfJsRenderer();
    await renderer.initialize("book.pdf", container);
    const initialRenderCount = pages[0].render.mock.calls.length;

    renderer.preferences({ zoom: 150 } as Parameters<typeof renderer.preferences>[0]);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(pages[0].cleanup).toHaveBeenCalled();
    expect(pages[0].render.mock.calls.length).toBeGreaterThan(initialRenderCount);

    await renderer.destroy();
  });
});
