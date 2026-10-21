import { AggregateRoot } from "@/shared/kernel/AggregateRoot";
import { BookId } from "../value-objects";
import { BookFile } from "../value-objects/BookFile";

export interface BookProps {
  id: BookId;
  title: string;
  authors: string[];
  coverUrl?: string | null;
  description?: string | null;
  genres?: string[];
  publishedDate?: string | null;
  pageCount?: number | null;
  isTextbook: boolean;
  subjects?: string[];
  files: BookFile[];
  isPublished?: boolean;
  isArchived?: boolean;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Book extends AggregateRoot<BookProps> {
  private constructor(props: BookProps) {
    super(props.id.value, {
      ...props,
      isPublished: props.isPublished ?? false,
      isArchived: props.isArchived ?? false,
      version: props.version ?? 1,
    });
  }

  static create(props: BookProps): Book {
    return new Book(props);
  }

  get bookId(): BookId {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get authors(): string[] {
    return this.props.authors || [];
  }
  get coverUrl(): string | null {
    return this.props.coverUrl || null;
  }
  get description(): string | null {
    return this.props.description || null;
  }
  get genres(): string[] {
    return this.props.genres || [];
  }
  get isTextbook(): boolean {
    return this.props.isTextbook;
  }
  get subjects(): string[] {
    return this.props.subjects || [];
  }
  get publishedDate(): string | null {
    return this.props.publishedDate || null;
  }
  get pageCount(): number | null {
    return this.props.pageCount || null;
  }
  get files(): BookFile[] {
    return [...this.props.files];
  }
  get isPublished(): boolean {
    return this.props.isPublished ?? false;
  }
  get isArchived(): boolean {
    return this.props.isArchived ?? false;
  }
  get version(): number {
    return this.props.version ?? 1;
  }

  getPrimaryFile(): BookFile | null {
    return this.props.files.find((f) => f.isPrimary) ?? null;
  }

  isPublicDomain(): boolean {
    if (!this.props.publishedDate) return false;
    const pubYear = new Date(this.props.publishedDate).getFullYear();
    return pubYear < 1928;
  }

  matchesTitleOrAuthor(query: string): boolean {
    const searchTerm = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(searchTerm) ||
      this.authors.some((a) => a.toLowerCase().includes(searchTerm))
    );
  }

  // Mutators

  public updateDetails(
    updates: Partial<
      Pick<BookProps, "title" | "description" | "genres" | "subjects">
    >,
  ): void {
    if (this.isArchived) throw new Error("Cannot update an archived book.");

    Object.assign(this.props, updates);
    this.props.updatedAt = new Date();
    this.incrementVersion();

    import("../events/BookEvents").then(({ BookUpdatedEvent }) => {
      this.addDomainEvent(new BookUpdatedEvent(this.id, this.version, updates));
    });
  }

  public publish(): void {
    if (this.isArchived) throw new Error("Cannot publish an archived book.");
    if (this.isPublished) return;

    this.props.isPublished = true;
    this.props.updatedAt = new Date();
    this.incrementVersion();

    import("../events/BookEvents").then(({ BookPublishedEvent }) => {
      this.addDomainEvent(
        new BookPublishedEvent(
          this.id,
          this.version,
          this.title,
          this.authors,
          this.genres,
          "en", // Default language
          0, // Default popularity
        ),
      );
    });
  }

  public unpublish(): void {
    if (!this.isPublished) return;

    this.props.isPublished = false;
    this.props.updatedAt = new Date();
    this.incrementVersion();

    import("../events/BookEvents").then(({ BookUnpublishedEvent }) => {
      this.addDomainEvent(new BookUnpublishedEvent(this.id, this.version));
    });
  }

  public archive(): void {
    if (this.isArchived) return;

    this.props.isArchived = true;
    this.props.isPublished = false; // Archiving unpublishes automatically
    this.props.updatedAt = new Date();
    this.incrementVersion();

    import("../events/BookEvents").then(({ BookArchivedEvent }) => {
      this.addDomainEvent(new BookArchivedEvent(this.id, this.version));
    });
  }

  private incrementVersion(): void {
    this.props.version = this.version + 1;
  }

  toJSON(): BookProps {
    return { ...this.props };
  }
}
