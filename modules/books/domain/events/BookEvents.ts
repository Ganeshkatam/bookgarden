import { DomainEvent } from "@/shared/domain/events/DomainEvent";

export class BookPublishedEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookPublished";
  public readonly eventName = BookPublishedEvent.EVENT_NAME;

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly title: string,
    public readonly authors: readonly string[],
    public readonly categories: readonly string[],
    public readonly language: string,
    public readonly popularity: number,
  ) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}

export class BookUpdatedEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookUpdated";
  public readonly eventName = BookUpdatedEvent.EVENT_NAME;

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly updates: Readonly<Record<string, any>>,
  ) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}

export class BookDeletedEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookDeleted";
  public readonly eventName = BookDeletedEvent.EVENT_NAME;

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}

export class BookUnpublishedEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookUnpublished";
  public readonly eventName = BookUnpublishedEvent.EVENT_NAME;

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}

export class BookArchivedEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookArchived";
  public readonly eventName = BookArchivedEvent.EVENT_NAME;

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}

export class BookRestoredEvent extends DomainEvent<string> {
  public static readonly EVENT_NAME = "BookRestored";
  public readonly eventName = BookRestoredEvent.EVENT_NAME;

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, aggregateVersion, 1);
    Object.freeze(this);
  }
}
