import {
  validateEventPayload,
  PayloadValidationError,
  KNOWN_PLATFORM_EVENTS,
  isKnownPlatformEvent,
} from "./payload-validators";
import { PlatformEventName } from "./types";

describe("validateEventPayload", () => {
  it("ensures KNOWN_PLATFORM_EVENTS covers canonical platform event names", () => {
    // Assert known key canonical events are present and verified
    expect(KNOWN_PLATFORM_EVENTS.has("reader.session.started")).toBe(true);
    expect(KNOWN_PLATFORM_EVENTS.has("reader.book.completed")).toBe(true);
    expect(KNOWN_PLATFORM_EVENTS.has("auth.user.logged.in")).toBe(true);
    expect(KNOWN_PLATFORM_EVENTS.has("discovery.search.executed")).toBe(true);

    // Verify type guard
    expect(isKnownPlatformEvent("reader.session.started")).toBe(true);
    expect(isKnownPlatformEvent("nonexistent.event")).toBe(false);
    expect(isKnownPlatformEvent(123)).toBe(false);
    expect(isKnownPlatformEvent(null)).toBe(false);
  });

  it("rejects unknown or invalid platform event names", () => {
    expect(() => validateEventPayload("unknown.event.name", { some: "data" })).toThrow(
      PayloadValidationError,
    );
    expect(() => validateEventPayload("reader.fake.event", {})).toThrow(
      PayloadValidationError,
    );
    expect(() => validateEventPayload("", {})).toThrow(
      PayloadValidationError,
    );
  });

  it("rejects non-object payloads", () => {
    expect(() => validateEventPayload("reader.book.completed", null)).toThrow(
      PayloadValidationError,
    );
    expect(() => validateEventPayload("reader.book.completed", "string")).toThrow(
      PayloadValidationError,
    );
    expect(() => validateEventPayload("reader.book.completed", [1, 2, 3])).toThrow(
      PayloadValidationError,
    );
  });

  describe("reader.session.started", () => {
    it("accepts valid payload", () => {
      const valid = {
        sessionId: "s1",
        userId: "u1",
        bookId: "b1",
        startedAt: "2026-10-09T00:00:00Z",
      };
      expect(validateEventPayload("reader.session.started", valid)).toEqual(valid);
    });

    it("rejects missing fields", () => {
      expect(() =>
        validateEventPayload("reader.session.started", {
          sessionId: "s1",
          userId: "u1",
        }),
      ).toThrow(PayloadValidationError);
    });
  });

  describe("reader.session.ended", () => {
    it("accepts valid payload", () => {
      const valid = {
        userId: "u1",
        bookId: "b1",
        durationSeconds: 120,
        pagesRead: 5,
      };
      expect(validateEventPayload("reader.session.ended", valid)).toEqual(valid);
    });

    it("rejects non-numeric pagesRead or durationSeconds", () => {
      expect(() =>
        validateEventPayload("reader.session.ended", {
          userId: "u1",
          bookId: "b1",
          durationSeconds: "not-a-number",
          pagesRead: 5,
        }),
      ).toThrow(PayloadValidationError);
    });
  });

  describe("reader.position.updated", () => {
    it("accepts valid locationAnchor", () => {
      const valid = {
        userId: "u1",
        bookId: "b1",
        locationAnchor: { type: "epubcfi", value: "/6/4" },
        occurredAt: "2026-10-09T00:00:00Z",
      };
      expect(validateEventPayload("reader.position.updated", valid)).toEqual(valid);
    });

    it("rejects malformed locationAnchor", () => {
      expect(() =>
        validateEventPayload("reader.position.updated", {
          userId: "u1",
          bookId: "b1",
          locationAnchor: "string-instead-of-object",
        }),
      ).toThrow(PayloadValidationError);
    });
  });

  describe("reader.book.completed", () => {
    it("accepts valid payload", () => {
      const valid = { userId: "u1", bookId: "b1" };
      expect(validateEventPayload("reader.book.completed", valid)).toEqual(valid);
    });

    it("rejects empty userId", () => {
      expect(() =>
        validateEventPayload("reader.book.completed", { userId: "", bookId: "b1" }),
      ).toThrow(PayloadValidationError);
    });
  });
});
