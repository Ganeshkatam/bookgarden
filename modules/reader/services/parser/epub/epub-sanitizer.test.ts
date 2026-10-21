/**
 * @jest-environment jsdom
 */

import { sanitizeEpubDocument, isolateEpubIframe } from "./epub-sanitizer";

describe("Hostile-Content EPUB Sanitizer & Sandbox Boundary", () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument("Untrusted EPUB Chapter");
  });

  it("1. Strips all executable script tags including SVG and nested frames", () => {
    doc.body.innerHTML = `
      <h1>Chapter 1</h1>
      <script>window.pwned = true;</script>
      <div>
        <p>Text</p>
        <svg><script>alert("svg xss")</script><circle r="10"/></svg>
        <iframe src="https://malicious.com"></iframe>
        <object data="exploit.swf"></object>
        <embed src="exploit.pdf"></embed>
      </div>
    `;

    sanitizeEpubDocument(doc);

    expect(doc.querySelectorAll("script").length).toBe(0);
    expect(doc.querySelectorAll("iframe").length).toBe(0);
    expect(doc.querySelectorAll("object").length).toBe(0);
    expect(doc.querySelectorAll("embed").length).toBe(0);
    expect(doc.body.innerHTML).toContain("Chapter 1");
    expect(doc.body.innerHTML).toContain("Text");
  });

  it("2. Strips inline on* event handlers from all elements", () => {
    doc.body.innerHTML = `
      <p id="p1" onclick="alert(1)" onmouseover="stealCookies()">Paragraph</p>
      <img id="img1" src="blob:image" onerror="exfiltrateData()" onload="trackRead()"/>
      <div id="div1" onfocus="hack()">Div content</div>
    `;

    sanitizeEpubDocument(doc);

    const p1 = doc.getElementById("p1");
    const img1 = doc.getElementById("img1");
    const div1 = doc.getElementById("div1");

    expect(p1?.hasAttribute("onclick")).toBe(false);
    expect(p1?.hasAttribute("onmouseover")).toBe(false);
    expect(img1?.hasAttribute("onerror")).toBe(false);
    expect(img1?.hasAttribute("onload")).toBe(false);
    expect(div1?.hasAttribute("onfocus")).toBe(false);
  });

  it("3. Strips javascript:, vbscript:, and data:text/html pseudo-protocols", () => {
    doc.body.innerHTML = `
      <a id="a1" href="javascript:alert(document.cookie)">Malicious Link</a>
      <a id="a2" href="javascript&#58;alert(1)">Obfuscated Link</a>
      <a id="a3" href="vbscript:msgbox(1)">VBScript Link</a>
      <a id="a4" href="#chapter2">Legitimate Anchor</a>
      <a id="a5" href="section2.xhtml">Relative Section</a>
    `;

    sanitizeEpubDocument(doc);

    expect(doc.getElementById("a1")?.hasAttribute("href")).toBe(false);
    expect(doc.getElementById("a2")?.hasAttribute("href")).toBe(false);
    expect(doc.getElementById("a3")?.hasAttribute("href")).toBe(false);
    expect(doc.getElementById("a4")?.getAttribute("href")).toBe("#chapter2");
    expect(doc.getElementById("a5")?.getAttribute("href")).toBe("section2.xhtml");
  });

  it("4. Blocks external HTTP/HTTPS tracking links, stylesheets, and images", () => {
    doc.body.innerHTML = `
      <img id="track-img" src="https://tracker.com/pixel.gif" />
      <link id="ext-css" rel="stylesheet" href="http://cdn.evil.com/font.css" />
      <img id="safe-blob" src="blob:http://localhost/chapter-img" />
      <img id="rel-img" src="images/cover.jpg" />
    `;

    sanitizeEpubDocument(doc);

    expect(doc.getElementById("track-img")?.hasAttribute("src")).toBe(false);
    expect(doc.getElementById("ext-css")?.hasAttribute("href")).toBe(false);
    expect(doc.getElementById("safe-blob")?.getAttribute("src")).toBe("blob:http://localhost/chapter-img");
    expect(doc.getElementById("rel-img")?.getAttribute("src")).toBe("images/cover.jpg");
  });

  it("5. Injects strict Content Security Policy meta tag into head", () => {
    sanitizeEpubDocument(doc);

    const cspMeta = doc.querySelector("meta[http-equiv='Content-Security-Policy']");
    expect(cspMeta).not.toBeNull();
    const content = cspMeta?.getAttribute("content");
    expect(content).toContain("default-src 'none'");
    expect(content).toContain("script-src 'none'");
    expect(content).toContain("frame-src 'none'");
    expect(content).toContain("connect-src 'none'");
  });

  it("6. isolateEpubIframe enforces sandbox attribute without allow-scripts and disarms parent access", () => {
    const iframe = document.createElement("iframe");
    const fakeWindow = {} as Window;

    isolateEpubIframe(iframe, fakeWindow);

    expect(iframe.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-top-navigation");

    expect(fakeWindow.parent).toBeNull();
    expect(fakeWindow.top).toBeNull();
  });
});
