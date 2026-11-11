import { BookRepository } from "../../domain/repositories/BookRepository";
import { BookId } from "../../domain/value-objects";

export interface ArchiveBookCommand {
  id: string;
}

export class ArchiveBookHandler {
  constructor(private readonly repository?: BookRepository) {}

  async execute(command: ArchiveBookCommand): Promise<void> {
    if (!this.repository) {
      console.warn("[Deferred] ArchiveBookCommand repository not injected. Operating in deferred mode.");
      return;
    }

    const book = await this.repository.findById(BookId.create(command.id));
    if (!book) {
      throw new Error(`Book with id ${command.id} not found`);
    }

    book.archive();
    await this.repository.save(book);
  }
}
