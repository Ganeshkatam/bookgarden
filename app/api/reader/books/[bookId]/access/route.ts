import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { SupabaseIdentityProvider } from "@/shared/infrastructure/identity/SupabaseIdentityProvider";
import { SupabaseBookRepository } from "@/modules/books/infrastructure/SupabaseBookRepository";
import {
  ReaderAccessService,
  ReaderAccessError,
} from "@/modules/reader/application/services/ReaderAccessService";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ bookId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { bookId } = await params;

  if (!bookId || typeof bookId !== "string" || bookId.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Book ID is required" } },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const identityProvider = new SupabaseIdentityProvider(supabase);
    const bookRepository = new SupabaseBookRepository(supabase);
    const service = new ReaderAccessService(identityProvider, bookRepository);

    const accessDto = await service.getSignedReaderAccess(bookId.trim());

    return NextResponse.json(accessDto, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error: unknown) {
    if (error instanceof ReaderAccessError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ReaderAccessRoute] Unexpected error for book ${bookId}:`, message);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred while securing book access",
        },
      },
      { status: 500 },
    );
  }
}
