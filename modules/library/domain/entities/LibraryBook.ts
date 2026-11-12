import { AggregateRoot } from "@/shared/kernel/AggregateRoot";
import { UserId } from "@/shared/kernel/UserId";
import {
  ReadingState,
  ProgressPercentage,
  ReadingStateValue,
  ReadingTimeline,
} from "../value-objects";
import {
  BookAddedToLibrary,
  BookFinished,
  ReadingStateChanged,
} from "../events";
import { InvalidReadingStateTransition } from "../errors";
import { ValidationError } from "@/shared/kernel/DomainError";

interface LibraryBookProps {
  userId: UserId;
  bookId: string;
  state: ReadingState;
  progress: ProgressPercentage;
  timeline: ReadingTimeline;
  isFavorite: boolean;
  updatedAt: Date;
}

export class LibraryBook extends AggregateRoot<LibraryBookProps> {
  get userId(): UserId {
    return this.props.userId;
  }
  get bookId(): string {
    return this.props.bookId;
  }
  get state(): ReadingState {
    return this.props.state;
  }
  get progress(): ProgressPercentage {
    return this.props.progress;
  }
  get timeline(): ReadingTimeline {
    return this.props.timeline;
  }
  get isFavorite(): boolean {
    return this.props.isFavorite;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private constructor(id: string, props: LibraryBookProps) {
    super(id, props);
  }

  // Factory method for creating a new LibraryBook from persistence
  static fromPersistence(
    id: string,
    userIdStr: string,
    bookId: string,
    stateVal: ReadingStateValue,
    progressVal: number,
    startedAt: Date | null,
    finishedAt: Date | null,
    updatedAt: Date,
    isFavorite: boolean = false,
  ): LibraryBook {
    return new LibraryBook(id, {
      userId: UserId.create(userIdStr),
      bookId,
      state: ReadingState.create(stateVal),
      progress: ProgressPercentage.create(progressVal),
      timeline: ReadingTimeline.restore(startedAt, finishedAt, updatedAt),
      isFavorite,
      updatedAt,
    });
  }

  // Factory method for adding a new book to the library
  static add(
    id: string,
    userIdStr: string,
    bookId: string,
    initialState: ReadingStateValue = "want_to_read",
  ): LibraryBook {
    if (!bookId || bookId.trim().length === 0) {
      throw new ValidationError("BookId cannot be empty");
    }

    const state = ReadingState.create(initialState);
    let timeline = ReadingTimeline.empty();

    if (state.isActive()) {
      timeline = timeline.start();
    } else if (state.isFinished()) {
      timeline = timeline.start().finish();
    }

    const book = new LibraryBook(id, {
      userId: UserId.create(userIdStr),
      bookId,
      state,
      progress: ProgressPercentage.create(state.isFinished() ? 100 : 0),
      timeline,
      isFavorite: false,
      updatedAt: new Date(),
    });

    book.addDomainEvent(
      new BookAddedToLibrary(book.id, userIdStr, bookId, initialState),
    );
    return book;
  }

  // Behavior: Start Reading
  startReading() {
    if (!this.state.canTransitionTo("currently_reading")) {
      throw new InvalidReadingStateTransition(
        this.state.value,
        "currently_reading",
      );
    }
    const previousState = this.state.value;
    this.props.state = ReadingState.reading();
    this.props.timeline = this.timeline.start();
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ReadingStateChanged(
        this.id,
        this.userId.value,
        this.bookId,
        previousState,
        "currently_reading",
      ),
    );
  }

  // Behavior: Update Progress
  updateProgress(newProgress: number) {
    if (!this.state.allowsProgress()) {
      // Automatically transition to reading if they update progress while in want_to_read
      if (this.state.value === "want_to_read" && newProgress > 0) {
        this.startReading();
      } else {
        throw new InvalidReadingStateTransition(
          this.state.value,
          "updateProgress",
        );
      }
    }

    this.props.progress = ProgressPercentage.create(newProgress);
    this.props.timeline = this.timeline.touch();
    this.props.updatedAt = new Date();

    if (this.progress.isComplete() && !this.state.isFinished()) {
      this.finish();
    }
  }

  // Behavior: Finish
  finish() {
    if (!this.state.canTransitionTo("finished")) {
      throw new InvalidReadingStateTransition(this.state.value, "finished");
    }
    const previousState = this.state.value;
    this.props.state = ReadingState.finished();
    this.props.progress = ProgressPercentage.create(100);
    this.props.timeline = this.timeline.finish();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ReadingStateChanged(
        this.id,
        this.userId.value,
        this.bookId,
        previousState,
        "finished",
      ),
    );
    if (this.timeline.finishedAt) {
      this.addDomainEvent(
        new BookFinished(
          this.id,
          this.userId.value,
          this.bookId,
          this.timeline.finishedAt,
        ),
      );
    }
  }

  // Behavior: Abandon
  abandon() {
    if (!this.state.canTransitionTo("abandoned")) {
      throw new InvalidReadingStateTransition(this.state.value, "abandoned");
    }
    const previousState = this.state.value;
    this.props.state = ReadingState.abandoned();
    this.props.timeline = this.timeline.touch();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ReadingStateChanged(
        this.id,
        this.userId.value,
        this.bookId,
        previousState,
        "abandoned",
      ),
    );
  }

  // Behavior: Restore (Move to Want To Read)
  restoreToWantToRead() {
    if (!this.state.canTransitionTo("want_to_read")) {
      throw new InvalidReadingStateTransition(this.state.value, "want_to_read");
    }
    const previousState = this.state.value;
    this.props.state = ReadingState.wantToRead();
    this.props.progress = ProgressPercentage.create(0);
    this.props.timeline = this.timeline.resetFinish().touch();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ReadingStateChanged(
        this.id,
        this.userId.value,
        this.bookId,
        previousState,
        "want_to_read",
      ),
    );
  }

  // Behavior: Toggle Favorite
  toggleFavorite() {
    this.props.isFavorite = !this.isFavorite;
    this.props.updatedAt = new Date();
  }
}
