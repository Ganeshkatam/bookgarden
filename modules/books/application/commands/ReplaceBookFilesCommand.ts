import { BookRepository } from "../../domain/repositories/BookRepository";
import { BookFileRepository } from "../../domain/repositories/BookFileRepository";
import { BookId } from "../../domain/value-objects";
import { BookFile } from "../../domain/value-objects/BookFile";

export interface ReplaceBookFileInput {
  id?: string;
  format: string;
  storagePath: string;
  mimeType: string;
  checksum?: string | null;
  size?: number | null;
  version?: number;
  isPrimary?: boolean;
}

export interface ReplaceBookFilesCommand {
  id: string;
  files: ReplaceBookFileInput[];
}

export class ReplaceBookFilesHandler {
  constructor(
    private readonly bookRepository?: BookRepository,
    private readonly fileRepository?: BookFileRepository,
  ) {}

  async execute(command: ReplaceBookFilesCommand): Promise<void> {
    if (!this.bookRepository) {
      console.warn("[Deferred] ReplaceBookFilesCommand repository not injected. Operating in deferred mode.");
      return;
    }

    const book = await this.bookRepository.findById(BookId.create(command.id));
    if (!book) {
      throw new Error(`Book with id ${command.id} not found`);
    }

    // If fileRepository is provided, clean up old files and persist new ones
    if (this.fileRepository) {
      for (const oldFile of book.files) {
        await this.fileRepository.delete(oldFile.id);
      }
    }

    const newBookFiles: BookFile[] = [];
    for (const fileInput of command.files) {
      const fileId = fileInput.id || crypto.randomUUID();
      const bookFile = BookFile.create({
        id: fileId,
        format: fileInput.format,
        storagePath: fileInput.storagePath,
        mimeType: fileInput.mimeType,
        checksum: fileInput.checksum ?? null,
        size: fileInput.size ?? null,
        version: fileInput.version || 1,
        isPrimary: fileInput.isPrimary ?? false,
      });

      if (this.fileRepository) {
        await this.fileRepository.save(command.id, bookFile);
      }
      newBookFiles.push(bookFile);
    }

    book.replaceFiles(newBookFiles);
    await this.bookRepository.save(book);
  }
}
