import { BookRepository } from "../../domain/repositories/BookRepository";
import { BookId } from "../../domain/value-objects";

export interface ChangeBookLanguageCommand {
  id: string;
  language: string;
}

export class ChangeBookLanguageHandler {
  constructor(private readonly repository?: BookRepository) {}

  async execute(command: ChangeBookLanguageCommand): Promise<void> {
    if (!this.repository) {
      console.warn("[Deferred] ChangeBookLanguageCommand repository not injected. Operating in deferred mode.");
      return;
    }

    const book = await this.repository.findById(BookId.create(command.id));
    if (!book) {
      throw new Error(`Book with id ${command.id} not found`);
    }

    book.changeLanguage(command.language);
    await this.repository.save(book);
  }
}
