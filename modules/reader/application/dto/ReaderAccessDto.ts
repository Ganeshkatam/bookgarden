export interface ReaderAccessDto {
  bookId: string;
  signedUrl: string;
  expiresAt: string; // ISO 8601 UTC
  fileType: "pdf" | "epub";
}
