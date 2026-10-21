export interface BookReaderDto {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  fileType: "pdf" | "epub";
}

export interface ReaderSessionDto {
  sessionId: string;
  position: any | null; // LocationAnchor / string
  progress: number; // 0-100
  lastRead: string | null;
}

export interface ReaderPreferencesDto {
  theme: "light" | "dark" | "sepia";
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
  zoom: number;
  scrollMode: "vertical" | "horizontal" | "paged";
  pageMode: "single" | "double";
}

export interface ReaderCapabilitiesDto {
  canHighlight: boolean;
  canBookmark: boolean;
  canAnnotate: boolean;
  canSearch: boolean;
}

export interface ReaderPageDto {
  book: BookReaderDto;
  session: ReaderSessionDto;
  preferences: ReaderPreferencesDto;
  capabilities: ReaderCapabilitiesDto;
}
