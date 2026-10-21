import {
  ReaderPageDto,
  BookReaderDto,
  ReaderSessionDto,
  ReaderPreferencesDto,
  ReaderCapabilitiesDto,
} from "../dto/ReaderPageDto";
import { IdentityProvider } from "@/shared/application/ports/identity/IdentityProvider";
import { BookRepository } from "@/modules/books/domain/repositories/BookRepository";
import { BookId } from "@/modules/books/domain/value-objects";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";

export class ReaderFacade {
  constructor(
    private readonly identityProvider: IdentityProvider,
    private readonly bookRepository: BookRepository,
    private readonly supabase?: SupabaseClient<Database>,
  ) {}

  async getReaderPage(bookIdStr: string): Promise<ReaderPageDto> {
    const user = await this.identityProvider.currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const bookEntity = await this.bookRepository.findById(
      BookId.create(bookIdStr),
    );
    if (!bookEntity) {
      throw new Error("Book not found");
    }

    const primaryFile = bookEntity.getPrimaryFile();

    const book: BookReaderDto = {
      id: bookEntity.bookId.value,
      title: bookEntity.title,
      author: bookEntity.authors.join(", ") || "Unknown",
      coverUrl: bookEntity.coverUrl,
      fileType: (primaryFile?.format as "pdf" | "epub") || "pdf",
    };

    // 1. Fetch Authoritative Reading Position & Progress from Database
    let initialPosition: any = null;
    let initialProgress = 0;
    let lastRead: string | null = new Date().toISOString();
    let activeSessionId = crypto.randomUUID();

    if (this.supabase) {
      try {
        const [progressRes, sessionRes] = await Promise.all([
          this.supabase
            .from("reading_progress")
            .select("location_anchor, last_read_at")
            .eq("user_id", user.id)
            .eq("book_id", bookIdStr)
            .maybeSingle(),
          this.supabase
            .from("reading_sessions")
            .select("id, current_page, percentage, last_read_at, started_at")
            .eq("user_id", user.id)
            .eq("book_id", bookIdStr)
            .order("last_read_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (progressRes.data?.location_anchor) {
          initialPosition = progressRes.data.location_anchor;
          lastRead = progressRes.data.last_read_at || lastRead;
        } else if (sessionRes.data?.current_page) {
          initialPosition = {
            type: "page",
            value: String(sessionRes.data.current_page),
          };
          lastRead = sessionRes.data.last_read_at || sessionRes.data.started_at || lastRead;
        }

        if (sessionRes.data?.percentage !== undefined && sessionRes.data?.percentage !== null) {
          initialProgress = sessionRes.data.percentage;
        }

        if (sessionRes.data?.id) {
          activeSessionId = sessionRes.data.id;
        }
      } catch (err) {
        console.warn("[ReaderFacade] Could not fetch saved position:", err);
      }
    }

    const session: ReaderSessionDto = {
      sessionId: activeSessionId,
      position: initialPosition,
      progress: initialProgress,
      lastRead,
    };

    // 2. Fetch User Reader Preferences from Database
    let theme: "light" | "dark" | "sepia" = "light";
    let fontFamily = "Inter";
    let fontSize = 16;
    let lineHeight = 1.5;

    if (this.supabase) {
      try {
        const { data: prefData } = await this.supabase
          .from("user_preferences")
          .select("reader_theme, theme, font_family, font_size, line_height")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prefData) {
          if (
            prefData.reader_theme === "dark" ||
            prefData.reader_theme === "sepia" ||
            prefData.reader_theme === "light"
          ) {
            theme = prefData.reader_theme;
          } else if (prefData.theme === "dark") {
            theme = "dark";
          }

          if (prefData.font_family) fontFamily = prefData.font_family;
          if (prefData.font_size) fontSize = Number(prefData.font_size);
          if (prefData.line_height) lineHeight = Number(prefData.line_height);
        }
      } catch (err) {
        console.warn("[ReaderFacade] Could not fetch reader preferences:", err);
      }
    }

    const preferences: ReaderPreferencesDto = {
      theme,
      fontFamily,
      fontSize,
      lineHeight,
      margin: 20,
      zoom: 100,
      scrollMode: "vertical",
      pageMode: "single",
    };

    const capabilities: ReaderCapabilitiesDto = {
      canHighlight: true,
      canBookmark: true,
      canAnnotate: true,
      canSearch: true,
    };

    return {
      book,
      session,
      preferences,
      capabilities,
    };
  }
}
