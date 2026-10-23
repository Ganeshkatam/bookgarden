const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const crypto = require("crypto");
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof global.crypto === "undefined") {
  global.crypto = crypto.webcrypto || {
    randomUUID: () => crypto.randomUUID(),
  };
} else if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => crypto.randomUUID();
}

if (typeof global.Request === "undefined") {
  global.Request = class Request {};
}
if (typeof global.Response === "undefined") {
  global.Response = class Response {};
}
if (typeof global.Headers === "undefined") {
  global.Headers = class Headers {};
}

if (typeof Element.prototype.scrollTo === "undefined") {
  Element.prototype.scrollTo = function scrollTo(options) {
    if (typeof options === "object") {
      if (options.top !== undefined) this.scrollTop = options.top;
      if (options.left !== undefined) this.scrollLeft = options.left;
    }
  };
}

if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

jest.mock("server-only", () => ({}), { virtual: true });

beforeEach(() => {
  if (typeof document !== "undefined" && document.cookie) {
    const cookies = document.cookie.split("; ");
    for (const c of cookies) {
      const eqIdx = c.indexOf("=");
      const name = eqIdx > -1 ? c.substring(0, eqIdx).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
  }
});
