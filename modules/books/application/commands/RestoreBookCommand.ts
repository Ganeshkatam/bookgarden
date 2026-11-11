import { BookRepository } from "../../domain/repositories/BookRepository";
import { BookId } from "../../domain/value-objects";

export interface RestoreBookCommand {
  id: string;
}

export class RestoreBookHandler {
  constructor(private readonly repository?: BookRepository) {}

  async execute(command: RestoreBookCommand): Promise<void> {
    if (!this.repository) {
      console.warn("[Deferred] RestoreBookCommand repository not injected. Operating in deferred mode.");
      return;
    }

    const book = await this.repository.findById(BookId.create(command.id));
    if (!book) {
      throw new Error(`Book with id ${command.id} not found`);
    }

    book.restore();
    await this.repository.save(book);
  }
}
