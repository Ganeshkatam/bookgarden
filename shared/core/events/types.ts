/**
 *  PLATFORM EVENT SYSTEM TYPES
 *
 * Defines the strict, typed payloads for inter-domain communication.
 * Domains must NEVER call each other directly for side effects.
 * They must emit an event on the bus instead.
 */

// Format-agnostic value object for Reader Domain single positions
export interface LocationAnchor {
  type: "epubcfi" | "pdf" | "html" | "custom";
  value: string;
}

export interface SearchFilters {
  genres?: string[];
  subjects?: string[];
  language?: string[];
  publicationYear?: number[];
}

// Format-agnostic value object for ranges/highlights
export interface SelectionAnchor {
  version: 1;
  start: LocationAnchor;
  end: LocationAnchor;
}

// Domain Object for Rendering
export interface ReaderHighlight {
  id: string;
  userId: string;
  bookId: string;
  selectionAnchor: SelectionAnchor;
  selectedText: string;
  color: string;
  hasNote: boolean; // Derived at load time, not persisted
}

// Discriminated union: what a Note is attached to
export type AnnotationTarget =
  | { type: "highlight"; highlightId: string }
  | { type: "location"; anchor: LocationAnchor };

// Domain Object for Notes
export interface ReaderNote {
  id: string;
  userId: string;
  bookId: string;
  target: AnnotationTarget;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

// Domain Object for Bookmarks
export interface ReaderBookmark {
  id: string;
  userId: string;
  bookId: string;
  anchor: LocationAnchor;
  label?: string;
  createdAt: string;
}

// UI Projection: Annotation (Highlight + Note)
export interface ReaderAnnotation {
  highlight: ReaderHighlight;
  note?: ReaderNote;
}

// UI Projection: Bookmark View (Bookmark + Context)
export interface ReaderBookmarkView {
  bookmark: ReaderBookmark;
  isCurrent: boolean;
  preview?: string;
}

// 1. Define standard event names as a strict union to prevent typos
export type PlatformEventName = keyof EventPayloads;

// 2. Define the payload structure for every single event
export interface EventPayloads {
  "reader.progress.updated": {
    userId: string;
    bookId: string;
    readerSessionId: string;
    previousPage: number;
    currentPage: number;
    pagesReadDelta: number;
    occurredAt: string;
  };
  "reader.position.updated": {
    userId: string;
    bookId: string;
    locationAnchor: LocationAnchor;
    occurredAt: string;
  };
  "reader.highlight.created": {
    userId: string;
    bookId: string;
    highlightId: string;
    selectionAnchor: SelectionAnchor;
    selectedText: string;
    color: string;
  };
  "reader.note.created": {
    userId: string;
    bookId: string;
    noteId: string;
    target: AnnotationTarget;
  };
  "reader.bookmark.created": {
    userId: string;
    bookId: string;
    bookmarkId: string;
    anchor: LocationAnchor;
  };
  "reader.page.completed": {
    userId: string;
    bookId: string;
    pageNumber: number;
    timestamp: number;
  };
  "reader.session.started": {
    userId: string;
    bookId: string;
    sessionId: string;
    startedAt: string;
  };
  "reader.session.ended": {
    userId: string;
    bookId: string;
    durationSeconds: number;
    pagesRead: number;
  };
  "reader.book.completed": {
    userId: string;
    bookId: string;
  };
  "auth.user.logged.in": { userId: string; timestamp: number };
  "library.book.added": { userId: string; bookId: string; status?: string };
  "profile.identity.updated": {
    userId: string;
    displayName: string;
    biography: string;
    location: string;
  };
  "profile.avatar.changed": { userId: string; avatarUrl: string };
  "progress.level.up": { userId: string; level: number; title: string };
  "progress.achievement.unlocked": { userId: string; achievementId: string };
  "book.liked": { userId: string; bookId: string };
  "book.rated": { userId: string; bookId: string; rating: number };
  "catalog.book.published": { bookId: string };
  "catalog.book.updated": { bookId: string };
  "catalog.book.deleted": { bookId: string };
  "account.export.requested": {
    userId: string;
    exportRequestId: string;
  };
  "account.export.completed": {
    userId: string;
    exportRequestId: string;
    downloadUrl: string;
  };
  "account.deleted": {
    userId: string;
    occurredAt: string;
  };
  "job.created": {
    jobId: string;
    jobType: string;
  };
  "job.started": {
    jobId: string;
    jobType: string;
    worker: string;
  };
  "job.completed": {
    jobId: string;
    jobType: string;
  };
  "job.failed": {
    jobId: string;
    jobType: string;
    error: string;
  };
  "job.retrying": {
    jobId: string;
    jobType: string;
    attempt: number;
  };

  // Search Analytics (Sprint 3 & 4)
  "discovery.search.executed": { 
    searchId: string;
    userId?: string; 
    query: string; 
    executionTimeMs: number; 
    resultCount: number; 
    filters: SearchFilters;
    sort: string; 
    timestamp: string;
  };
  "discovery.search.zero_results": { searchId: string; query: string };
  "discovery.search.result_clicked": { searchId: string; bookId: string; rank: number };
  "discovery.search.autocomplete_used": { query: string; selectedSuggestion: string };
  "discovery.search.filters_changed": { searchId: string; addedFilters: Partial<SearchFilters>; removedFilters: Partial<SearchFilters> };
  "discovery.search.trending_updated": { timestamp: string };
}

export interface EventContext {
  eventId?: string;
  occurredAt?: string;
}

// 3. The Contract for the Event Bus
export interface IEventBus {
  emit<T extends PlatformEventName>(
    event: T,
    payload: EventPayloads[T],
    context?: EventContext,
  ): void;
  dispatch<T extends PlatformEventName>(
    event: T,
    payload: EventPayloads[T],
    context?: EventContext,
  ): Promise<void>;
  subscribe<T extends PlatformEventName>(
    event: T,
    handler: (payload: EventPayloads[T], context?: EventContext) => void | Promise<void>,
  ): () => void;
}

