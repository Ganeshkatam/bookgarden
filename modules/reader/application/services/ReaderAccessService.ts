import { IdentityProvider } from "@/shared/application/ports/identity/IdentityProvider";
import { BookRepository } from "@/modules/books/domain/repositories/BookRepository";
import { BookId } from "@/modules/books/domain/value-objects";
import { ReaderAccessDto } from "../dto/ReaderAccessDto";
import { evaluateReaderAccess } from "../policy/ReaderAccessPolicy";
import { assertCanonicalBookObjectKey } from "../policy/CanonicalStorageKey";
import { ReaderAccessError } from "../errors/ReaderAccessError";
import { createSupabaseAdminClient } from "@/shared/core/database/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/core/types/database";

export { ReaderAccessError };

export class ReaderAccessService {
  constructor(
    private readonly identityProvider: IdentityProvider,
    private readonly bookRepository: BookRepository,
    private readonly storageAdminClient?: SupabaseClient<Database>,
  ) {}

  async getSignedReaderAccess(bookIdStr: string): Promise<ReaderAccessDto> {
    const user = await this.identityProvider.currentUser();
    if (!user) {
      throw new ReaderAccessError("Unauthorized", 401, "UNAUTHENTICATED");
    }

    const bookEntity = await this.bookRepository.findById(
      BookId.create(bookIdStr),
    );
    if (!bookEntity) {
      throw new ReaderAccessError("Book not found", 404, "BOOK_NOT_FOUND");
    }

    const accessEval = evaluateReaderAccess(
      { id: user.id },
      {
        id: bookEntity.bookId.value,
        isPublished: bookEntity.isPublished,
        isArchived: bookEntity.isArchived,
      },
    );

    if (!accessEval.allowed) {
      switch (accessEval.reason) {
        case "BOOK_ARCHIVED":
          throw new ReaderAccessError("Book is archived", 403, "BOOK_ARCHIVED");
        case "BOOK_UNPUBLISHED":
          throw new ReaderAccessError("Book is unpublished", 403, "BOOK_UNPUBLISHED");
        case "MEMBER_ACCESS_DENIED":
          throw new ReaderAccessError("Not authorized to read this book", 403, "MEMBER_ACCESS_DENIED");
        default:
          throw new ReaderAccessError("Access denied", 403, "ACCESS_DENIED");
      }
    }

    const primaryFile = bookEntity.getPrimaryFile();
    if (!primaryFile || !primaryFile.storagePath) {
      throw new ReaderAccessError(
        "Primary content file unavailable",
        404,
        "PRIMARY_CONTENT_FILE_UNAVAILABLE",
      );
    }

    // Enforce canonical object key contract without legacy URL parsing fallbacks
    const objectKey = assertCanonicalBookObjectKey(
      primaryFile.storagePath,
      bookEntity.bookId.value,
    );

    const adminStorage =
      this.storageAdminClient || createSupabaseAdminClient();

    const SIGNED_URL_TTL_SECONDS = 60;
    const { data: signData, error: signError } = await adminStorage.storage
      .from("book-pdfs")
      .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

    if (signError || !signData?.signedUrl) {
      console.error(
        `[ReaderAccessService] Failed to generate signed URL for book ${bookIdStr} object ${objectKey}:`,
        signError,
      );
      throw new ReaderAccessError(
        "Failed to generate secure book access token",
        500,
        "SIGNING_FAILED",
      );
    }

    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();

    return {
      bookId: bookEntity.bookId.value,
      signedUrl: signData.signedUrl,
      expiresAt,
      fileType: (primaryFile.format as "pdf" | "epub") || "pdf",
    };
  }
}
