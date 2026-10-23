import { BookDto } from "@/modules/library/application/dto/response/BookDto";
import { safeStorage } from "@/shared/core/storage/privacy-storage";

const MAX_HISTORY = parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY!, 10);
const STORAGE_KEY = process.env.NEXT_PUBLIC_RECENT_VIEWS_KEY!;

export interface ViewHistoryItem {
  book: BookDto;
  viewedAt: number;
}

export function addToViewHistory(book: BookDto): void {
  const history = getViewHistory();

  // Remove if already exists
  const filtered = history.filter((item) => item.book.id !== book.id);

  // Add to front
  const updated = [{ book, viewedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_HISTORY,
  );

  safeStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated),
    "analytics",
    { preferredStore: "localStorage" }
  );
}

export function getViewHistory(): ViewHistoryItem[] {
  try {
    const stored = safeStorage.getItem(STORAGE_KEY, "analytics");
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearViewHistory(): void {
  safeStorage.removeItem(STORAGE_KEY);
}
