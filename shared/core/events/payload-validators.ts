import { PlatformEventName, EventPayloads } from "./types";

export class PayloadValidationError extends Error {
  constructor(
    public readonly eventName: string,
    public readonly reason: string,
    public readonly rawPayload: unknown,
  ) {
    super(`Payload validation failed for event '${eventName}': ${reason}`);
    this.name = "PayloadValidationError";
  }
}

/**
 * Canonical mapping of all platform event names.
 * Using Record<PlatformEventName, true> guarantees at compile time that any addition
 * or removal in EventPayloads must be reflected here, preventing any registry drift.
 */
const PLATFORM_EVENTS_REGISTRY: Record<PlatformEventName, true> = {
  "reader.progress.updated": true,
  "reader.position.updated": true,
  "reader.highlight.created": true,
  "reader.note.created": true,
  "reader.bookmark.created": true,
  "reader.page.completed": true,
  "reader.session.started": true,
  "reader.session.ended": true,
  "reader.book.completed": true,
  "auth.user.logged.in": true,
  "library.book.added": true,
  "profile.identity.updated": true,
  "profile.avatar.changed": true,
  "progress.level.up": true,
  "progress.achievement.unlocked": true,
  "book.liked": true,
  "book.rated": true,
  "catalog.book.published": true,
  "catalog.book.updated": true,
  "catalog.book.deleted": true,
  "account.export.requested": true,
  "account.export.completed": true,
  "account.deleted": true,
  "job.created": true,
  "job.started": true,
  "job.completed": true,
  "job.failed": true,
  "job.retrying": true,
  "discovery.search.executed": true,
  "discovery.search.zero_results": true,
  "discovery.search.result_clicked": true,
  "discovery.search.autocomplete_used": true,
  "discovery.search.filters_changed": true,
  "discovery.search.trending_updated": true,
};

export const KNOWN_PLATFORM_EVENTS: ReadonlySet<PlatformEventName> = new Set<PlatformEventName>(
  Object.keys(PLATFORM_EVENTS_REGISTRY) as PlatformEventName[],
);

export function isKnownPlatformEvent(name: unknown): name is PlatformEventName {
  return typeof name === "string" && KNOWN_PLATFORM_EVENTS.has(name as PlatformEventName);
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isNumber(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val);
}

export function validateEventPayload<T extends PlatformEventName>(
  eventName: T,
  rawPayload: unknown,
): EventPayloads[T];
export function validateEventPayload(
  eventName: unknown,
  rawPayload: unknown,
): EventPayloads[PlatformEventName];
export function validateEventPayload(
  eventName: unknown,
  rawPayload: unknown,
): EventPayloads[PlatformEventName] {
  if (!isKnownPlatformEvent(eventName)) {
    throw new PayloadValidationError(
      String(eventName),
      `Unknown or unsupported platform event name: '${String(eventName)}'`,
      rawPayload,
    );
  }

  if (!isObject(rawPayload)) {
    throw new PayloadValidationError(eventName, "Payload must be a non-null JSON object", rawPayload);
  }

  const p = rawPayload as Record<string, unknown>;

  switch (eventName) {
    case "reader.session.started": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNonEmptyString(p.sessionId)) throw new PayloadValidationError(eventName, "Missing or invalid sessionId", rawPayload);
      if (!isNonEmptyString(p.startedAt)) throw new PayloadValidationError(eventName, "Missing or invalid startedAt", rawPayload);
      break;
    }

    case "reader.session.ended": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNumber(p.durationSeconds)) throw new PayloadValidationError(eventName, "Missing or invalid durationSeconds", rawPayload);
      if (!isNumber(p.pagesRead)) throw new PayloadValidationError(eventName, "Missing or invalid pagesRead", rawPayload);
      break;
    }

    case "reader.position.updated": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isObject(p.locationAnchor)) throw new PayloadValidationError(eventName, "Missing locationAnchor object", rawPayload);
      const anchor = p.locationAnchor as Record<string, unknown>;
      if (!isNonEmptyString(anchor.type) || typeof anchor.value !== "string") {
        throw new PayloadValidationError(eventName, "Invalid locationAnchor shape (requires type and value)", rawPayload);
      }
      break;
    }

    case "reader.progress.updated": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNonEmptyString(p.readerSessionId)) throw new PayloadValidationError(eventName, "Missing or invalid readerSessionId", rawPayload);
      if (!isNumber(p.currentPage)) throw new PayloadValidationError(eventName, "Missing or invalid currentPage", rawPayload);
      break;
    }

    case "reader.page.completed": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNumber(p.pageNumber)) throw new PayloadValidationError(eventName, "Missing or invalid pageNumber", rawPayload);
      if (!isNumber(p.timestamp)) throw new PayloadValidationError(eventName, "Missing or invalid timestamp", rawPayload);
      break;
    }

    case "reader.book.completed": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      break;
    }

    case "reader.highlight.created": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNonEmptyString(p.highlightId)) throw new PayloadValidationError(eventName, "Missing or invalid highlightId", rawPayload);
      if (!isObject(p.selectionAnchor)) throw new PayloadValidationError(eventName, "Missing selectionAnchor object", rawPayload);
      break;
    }

    case "reader.note.created": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNonEmptyString(p.noteId)) throw new PayloadValidationError(eventName, "Missing or invalid noteId", rawPayload);
      if (!isObject(p.target)) throw new PayloadValidationError(eventName, "Missing target object", rawPayload);
      break;
    }

    case "reader.bookmark.created": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNonEmptyString(p.bookmarkId)) throw new PayloadValidationError(eventName, "Missing or invalid bookmarkId", rawPayload);
      if (!isObject(p.anchor)) throw new PayloadValidationError(eventName, "Missing anchor object", rawPayload);
      break;
    }

    case "auth.user.logged.in": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNumber(p.timestamp)) throw new PayloadValidationError(eventName, "Missing or invalid timestamp", rawPayload);
      break;
    }

    case "library.book.added": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      break;
    }

    case "profile.identity.updated": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (typeof p.displayName !== "string") throw new PayloadValidationError(eventName, "Missing or invalid displayName", rawPayload);
      break;
    }

    case "profile.avatar.changed": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.avatarUrl)) throw new PayloadValidationError(eventName, "Missing or invalid avatarUrl", rawPayload);
      break;
    }

    case "progress.level.up": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNumber(p.level)) throw new PayloadValidationError(eventName, "Missing or invalid level", rawPayload);
      if (!isNonEmptyString(p.title)) throw new PayloadValidationError(eventName, "Missing or invalid title", rawPayload);
      break;
    }

    case "progress.achievement.unlocked": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.achievementId)) throw new PayloadValidationError(eventName, "Missing or invalid achievementId", rawPayload);
      break;
    }

    case "catalog.book.published":
    case "catalog.book.updated":
    case "catalog.book.deleted": {
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      break;
    }

    case "book.liked": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      break;
    }

    case "book.rated": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNumber(p.rating)) throw new PayloadValidationError(eventName, "Missing or invalid rating", rawPayload);
      break;
    }

    case "account.export.requested": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.exportRequestId)) throw new PayloadValidationError(eventName, "Missing or invalid exportRequestId", rawPayload);
      break;
    }

    case "account.export.completed": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.exportRequestId)) throw new PayloadValidationError(eventName, "Missing or invalid exportRequestId", rawPayload);
      if (!isNonEmptyString(p.downloadUrl)) throw new PayloadValidationError(eventName, "Missing or invalid downloadUrl", rawPayload);
      break;
    }

    case "account.deleted": {
      if (!isNonEmptyString(p.userId)) throw new PayloadValidationError(eventName, "Missing or invalid userId", rawPayload);
      if (!isNonEmptyString(p.occurredAt)) throw new PayloadValidationError(eventName, "Missing or invalid occurredAt", rawPayload);
      break;
    }

    case "job.created":
    case "job.completed": {
      if (!isNonEmptyString(p.jobId)) throw new PayloadValidationError(eventName, "Missing or invalid jobId", rawPayload);
      if (!isNonEmptyString(p.jobType)) throw new PayloadValidationError(eventName, "Missing or invalid jobType", rawPayload);
      break;
    }

    case "job.started": {
      if (!isNonEmptyString(p.jobId)) throw new PayloadValidationError(eventName, "Missing or invalid jobId", rawPayload);
      if (!isNonEmptyString(p.jobType)) throw new PayloadValidationError(eventName, "Missing or invalid jobType", rawPayload);
      if (!isNonEmptyString(p.worker)) throw new PayloadValidationError(eventName, "Missing or invalid worker", rawPayload);
      break;
    }

    case "job.failed": {
      if (!isNonEmptyString(p.jobId)) throw new PayloadValidationError(eventName, "Missing or invalid jobId", rawPayload);
      if (!isNonEmptyString(p.jobType)) throw new PayloadValidationError(eventName, "Missing or invalid jobType", rawPayload);
      if (typeof p.error !== "string") throw new PayloadValidationError(eventName, "Missing or invalid error", rawPayload);
      break;
    }

    case "job.retrying": {
      if (!isNonEmptyString(p.jobId)) throw new PayloadValidationError(eventName, "Missing or invalid jobId", rawPayload);
      if (!isNonEmptyString(p.jobType)) throw new PayloadValidationError(eventName, "Missing or invalid jobType", rawPayload);
      if (!isNumber(p.attempt)) throw new PayloadValidationError(eventName, "Missing or invalid attempt", rawPayload);
      break;
    }

    case "discovery.search.executed": {
      if (!isNonEmptyString(p.searchId)) throw new PayloadValidationError(eventName, "Missing or invalid searchId", rawPayload);
      if (typeof p.query !== "string") throw new PayloadValidationError(eventName, "Missing or invalid query", rawPayload);
      if (!isNumber(p.executionTimeMs)) throw new PayloadValidationError(eventName, "Missing or invalid executionTimeMs", rawPayload);
      if (!isNumber(p.resultCount)) throw new PayloadValidationError(eventName, "Missing or invalid resultCount", rawPayload);
      break;
    }

    case "discovery.search.zero_results": {
      if (!isNonEmptyString(p.searchId)) throw new PayloadValidationError(eventName, "Missing or invalid searchId", rawPayload);
      if (typeof p.query !== "string") throw new PayloadValidationError(eventName, "Missing or invalid query", rawPayload);
      break;
    }

    case "discovery.search.result_clicked": {
      if (!isNonEmptyString(p.searchId)) throw new PayloadValidationError(eventName, "Missing or invalid searchId", rawPayload);
      if (!isNonEmptyString(p.bookId)) throw new PayloadValidationError(eventName, "Missing or invalid bookId", rawPayload);
      if (!isNumber(p.rank)) throw new PayloadValidationError(eventName, "Missing or invalid rank", rawPayload);
      break;
    }

    case "discovery.search.autocomplete_used": {
      if (typeof p.query !== "string") throw new PayloadValidationError(eventName, "Missing or invalid query", rawPayload);
      if (!isNonEmptyString(p.selectedSuggestion)) throw new PayloadValidationError(eventName, "Missing or invalid selectedSuggestion", rawPayload);
      break;
    }

    case "discovery.search.filters_changed": {
      if (!isNonEmptyString(p.searchId)) throw new PayloadValidationError(eventName, "Missing or invalid searchId", rawPayload);
      break;
    }

    case "discovery.search.trending_updated": {
      if (!isNonEmptyString(p.timestamp)) throw new PayloadValidationError(eventName, "Missing or invalid timestamp", rawPayload);
      break;
    }
  }

  return rawPayload as EventPayloads[PlatformEventName];
}
