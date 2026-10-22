/**
 * File validation utility for storage uploads.
 * Inspects magic bytes (file signature headers) and size boundaries
 * to prevent MIME spoofing (e.g., executing polyglot or executable payloads disguised as images).
 */

export const STORAGE_BUCKET_LIMITS: Record<
  string,
  { maxBytes: number; allowedMimes: string[] }
> = {
  avatars: {
    maxBytes: 2 * 1024 * 1024, // 2MB
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  },
  shelves: {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  "user-images": {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  },
};

export const ALLOWED_USER_STORAGE_BUCKETS = Object.keys(STORAGE_BUCKET_LIMITS);

/**
 * Safely extracts the first N header bytes from a File or Blob across runtime environments
 * (Node.js, edge runtime, and jsdom test runner).
 */
export async function getFileHeaderBytes(
  file: File | Blob,
  numBytes = 16,
): Promise<Uint8Array> {
  // 1. Native Web standard arrayBuffer()
  if (typeof (file as any).arrayBuffer === "function") {
    try {
      const ab = await (file as any).arrayBuffer();
      return new Uint8Array(ab).subarray(0, numBytes);
    } catch {
      // Fall through to other extraction methods
    }
  }

  // 2. jsdom / browser FileReader fallback
  if (typeof FileReader !== "undefined") {
    try {
      const bytes = await new Promise<Uint8Array>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result).subarray(0, numBytes));
          } else if (typeof reader.result === "string") {
            const buf = Buffer.from(reader.result, "binary");
            resolve(new Uint8Array(buf).subarray(0, numBytes));
          } else {
            resolve(new Uint8Array(0));
          }
        };
        reader.onerror = () => resolve(new Uint8Array(0));
        reader.readAsArrayBuffer(file.slice(0, numBytes));
      });
      if (bytes && bytes.length > 0) {
        return bytes;
      }
    } catch {
      // Fall through
    }
  }

  // 3. Node / jsdom internal buffer access fallback
  if ((file as any)._buffer) {
    return new Uint8Array((file as any)._buffer).subarray(0, numBytes);
  }

  return new Uint8Array(0);
}

/**
 * Inspects byte header against allowed MIME type signatures.
 */
export function isAllowedImageMagicBytes(
  bytes: Uint8Array,
  allowedMimes: string[],
): boolean {
  if (bytes.length < 3) {
    return false;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return allowedMimes.includes("image/jpeg");
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return allowedMimes.includes("image/png");
  }

  // GIF: GIF87a or GIF89a
  if (bytes.length >= 6) {
    const isGif =
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61;
    if (isGif) {
      return allowedMimes.includes("image/gif");
    }
  }

  // WebP: RIFF....WEBP (requires 12 bytes)
  if (bytes.length >= 12) {
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const isWebp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    if (isRiff && isWebp) {
      return allowedMimes.includes("image/webp");
    }
  }

  return false;
}
