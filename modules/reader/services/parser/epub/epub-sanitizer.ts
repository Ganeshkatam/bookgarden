/**
 * Defensive EPUB hostile-content boundary and DOM sanitizer.
 * Sanitizes untrusted EPUB document content before and during rendering:
 * - Strips all executable elements (<script>, <object>, <embed>, nested <iframe>)
 * - Strips inline event handlers (on* attributes)
 * - Neutralizes javascript: / vbscript: URLs
 * - Blocks external network resources (http: / https: tracking links / pixels)
 * - Injects a restrictive Content Security Policy into the document head
 * - Enforces strict iframe sandboxing and parent-window access denial
 */

const EPUB_STRICT_CSP =
  "default-src 'none'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self' blob: data:; script-src 'none'; frame-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none';";

export function sanitizeEpubDocument(doc: Document): void {
  if (!doc) return;

  // 1. Remove dangerous executable elements completely
  const dangerousTags = [
    "script",
    "noscript",
    "object",
    "embed",
    "iframe",
    "frame",
    "frameset",
    "applet",
    "base",
  ];

  for (const tag of dangerousTags) {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  }

  // 2. Remove SVG scripts and handlers
  const svgScripts = doc.querySelectorAll("svg script, svg-script");
  svgScripts.forEach((el) => el.remove());

  // 3. Inspect every element for event handlers and dangerous URI schemes
  const allElements = doc.querySelectorAll("*");
  allElements.forEach((el) => {
    // Collect attributes to delete (avoiding mutation while iterating NamedNodeMap)
    const attrsToRemove: string[] = [];

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim().toLowerCase();

      // Check for inline event handlers (onclick, onload, onerror, etc.)
      if (attrName.startsWith("on")) {
        attrsToRemove.push(attr.name);
        continue;
      }

      // Check for pseudo-protocol script execution
      if (
        attrName === "href" ||
        attrName === "src" ||
        attrName === "xlink:href" ||
        attrName === "formaction"
      ) {
        if (
          attrValue.startsWith("javascript:") ||
          attrValue.startsWith("vbscript:") ||
          attrValue.startsWith("data:text/html")
        ) {
          attrsToRemove.push(attr.name);
          continue;
        }

        // Block external network resource loading from untrusted sources
        // Packaged EPUB assets use relative paths or blob: / data: URLs
        if (
          (attrName === "src" || attrName === "href") &&
          (attrValue.startsWith("http://") || attrValue.startsWith("https://"))
        ) {
          // If it is an image, media, or stylesheet, block external call
          if (["img", "link", "audio", "video", "source"].includes(el.tagName.toLowerCase())) {
            attrsToRemove.push(attr.name);
            continue;
          }
        }
      }

      // Sanitize dangerous style attribute expressions (e.g. url(javascript:...))
      if (attrName === "style") {
        if (
          attrValue.includes("javascript:") ||
          attrValue.includes("expression(") ||
          attrValue.includes("-moz-binding")
        ) {
          attrsToRemove.push(attr.name);
          continue;
        }
      }
    }

    for (const attr of attrsToRemove) {
      el.removeAttribute(attr);
    }

    // Force links to open safely without opener/referrer privileges
    if (el.tagName.toLowerCase() === "a") {
      el.setAttribute("rel", "noopener noreferrer nofollow");
      el.setAttribute("target", "_blank");
    }
  });

  // 4. Inject restrictive Content Security Policy meta tag into head
  if (doc.head) {
    const existingCsp = doc.querySelector("meta[http-equiv='Content-Security-Policy']");
    if (!existingCsp) {
      const cspMeta = doc.createElement("meta");
      cspMeta.setAttribute("http-equiv", "Content-Security-Policy");
      cspMeta.setAttribute("content", EPUB_STRICT_CSP);
      doc.head.insertBefore(cspMeta, doc.head.firstChild);
    }
  }
}

/**
 * Hardens the iframe hosting the EPUB rendition.
 *
 * ARCHITECTURAL SECURITY INVARIANT:
 * The iframe sandbox attribute (without 'allow-scripts') together with strict CSP
 * is the primary security boundary enforced by the browser.
 * Window property neutralization (window.parent, window.top) is a defense-in-depth
 * compatibility control to reduce unhandled runtime traversal attempts.
 */
export function isolateEpubIframe(iframe: HTMLIFrameElement, win?: Window | null): void {
  if (iframe) {
    // Strictly disallow allow-scripts, allow-top-navigation, allow-popups
    iframe.setAttribute("sandbox", "allow-same-origin");
  }

  if (win) {
    try {
      // Disarm parent window traversal attempts
      Object.defineProperty(win, "parent", {
        get() {
          return null;
        },
        configurable: false,
      });

      Object.defineProperty(win, "top", {
        get() {
          return null;
        },
        configurable: false,
      });
    } catch {
      // Non-fatal if browser restricts re-definition
    }
  }
}
