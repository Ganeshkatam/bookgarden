"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { getCurrentUser } from "@/modules/authentication/presentation/actions/auth";
import { ServerActionResult } from "@/lib/actions/action-result";
import {
  AnnotationPersistenceMapper,
  HighlightPersistenceRow,
  AnnotationPersistenceRow,
} from "../infrastructure/mappers/AnnotationPersistenceMapper";
import type { Annotation } from "../types/models";
import type { AnnotationAnchor } from "../../application/ports/AnnotationAnchor";

const SyncItemSchema = z.object({
  id: z.string().uuid("Invalid item UUID"),
  bookId: z.string().uuid("Invalid book UUID"),
  userId: z.string().uuid("Invalid user UUID"),
  type: z.enum(["highlight", "note", "drawing", "citation"]),
  anchor: z.record(z.string(), z.unknown()),
  color: z.enum(["yellow", "green", "blue", "pink", "purple"]).optional(),
  selectedText: z.string().optional(),
  noteText: z.string().optional(),
  highlightId: z.string().uuid().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const PushChangesPayloadSchema = z.object({
  creates: z.array(SyncItemSchema),
  updates: z.array(SyncItemSchema),
  deletes: z.array(
    z.object({
      id: z.string().uuid("Invalid delete ID"),
      type: z.enum(["highlight", "note"]),
    }),
  ),
});

export interface SyncResponseData {
  acknowledgedIds: string[];
  failedOperations: Array<{ id: string; error: string }>;
}

/**
 * Server Action: Pull all annotations and highlights for a given book belonging to the authenticated user.
 */
export async function fetchAnnotations(
  bookId: string,
): Promise<ServerActionResult<Annotation[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser();
    if (!user) return { success: false, error: { message: "Unauthorized" } };

    // Fetch highlights for book
    const { data: rawHighlights, error: hlError } = await supabase
      .from("highlights")
      .select("id, user_id, book_id, location_anchor, selected_text, color, created_at")
      .eq("book_id", bookId)
      .eq("user_id", user.id);

    if (hlError) {
      return { success: false, error: { message: hlError.message } };
    }

    // Fetch notes/annotations for book
    const { data: rawNotes, error: notesError } = await supabase
      .from("annotations")
      .select("id, user_id, book_id, highlight_id, location_anchor, body_markdown, created_at, updated_at")
      .eq("book_id", bookId)
      .eq("user_id", user.id);

    if (notesError) {
      return { success: false, error: { message: notesError.message } };
    }

    const domainHighlights = (rawHighlights || []).map((h) =>
      AnnotationPersistenceMapper.highlightToDomain(h as unknown as HighlightPersistenceRow),
    );

    const domainNotes = (rawNotes || []).map((n) =>
      AnnotationPersistenceMapper.noteToDomain(n as unknown as AnnotationPersistenceRow),
    );

    return { success: true, data: [...domainHighlights, ...domainNotes] };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "Unknown error during fetchAnnotations" },
    };
  }
}

/**
 * Server Action: Process push changes idempotently against public.highlights and public.annotations.
 */
export async function pushAnnotationChanges(
  rawChanges: unknown,
): Promise<ServerActionResult<SyncResponseData>> {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: "Unauthorized" } };
    }

    const parsed = PushChangesPayloadSchema.safeParse(rawChanges);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: `Validation failed: ${parsed.error.message}` },
      };
    }

    const changes = parsed.data;
    const acknowledgedIds: string[] = [];
    const failedOperations: Array<{ id: string; error: string }> = [];

    // Separate creates into highlights first, then notes (to satisfy foreign key annotations.highlight_id)
    const highlightCreates = changes.creates.filter((c) => c.type === "highlight");
    const noteCreates = changes.creates.filter((c) => c.type !== "highlight");

    // 1. Process Highlight Creates (idempotent upsert)
    for (const item of highlightCreates) {
      if (item.userId !== user.id) {
        failedOperations.push({ id: item.id, error: "Unauthorized userId mismatch" });
        continue;
      }

      const domainItem: Annotation = {
        ...item,
        anchor: item.anchor as unknown as AnnotationAnchor,
        syncState: "pending_create",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };

      const row = AnnotationPersistenceMapper.toHighlightPersistence(domainItem);

      const { error } = await supabase.from("highlights").upsert(
        {
          id: row.id,
          user_id: user.id,
          book_id: row.book_id,
          location_anchor: row.location_anchor,
          selected_text: row.selected_text,
          color: row.color,
          created_at: row.created_at,
        },
        { onConflict: "id" },
      );

      if (error) {
        failedOperations.push({ id: item.id, error: error.message });
      } else {
        acknowledgedIds.push(item.id);
      }
    }

    // 2. Process Note Creates (idempotent upsert)
    for (const item of noteCreates) {
      if (item.userId !== user.id) {
        failedOperations.push({ id: item.id, error: "Unauthorized userId mismatch" });
        continue;
      }

      const domainItem: Annotation = {
        ...item,
        anchor: item.anchor as unknown as AnnotationAnchor,
        syncState: "pending_create",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };

      const row = AnnotationPersistenceMapper.toNotePersistence(domainItem);

      const { error } = await supabase.from("annotations").upsert(
        {
          id: row.id,
          user_id: user.id,
          book_id: row.book_id,
          highlight_id: row.highlight_id,
          location_anchor: row.location_anchor,
          body_markdown: row.body_markdown,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        { onConflict: "id" },
      );

      if (error) {
        failedOperations.push({ id: item.id, error: error.message });
      } else {
        acknowledgedIds.push(item.id);
      }
    }

    // 3. Process Updates
    for (const item of changes.updates) {
      if (item.userId !== user.id) {
        failedOperations.push({ id: item.id, error: "Unauthorized userId mismatch" });
        continue;
      }

      const domainItem: Annotation = {
        ...item,
        anchor: item.anchor as unknown as AnnotationAnchor,
        syncState: "pending_update",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      };

      if (item.type === "highlight") {
        const row = AnnotationPersistenceMapper.toHighlightPersistence(domainItem);

        const { error } = await supabase
          .from("highlights")
          .update({
            location_anchor: row.location_anchor,
            selected_text: row.selected_text,
            color: row.color,
          })
          .eq("id", row.id)
          .eq("user_id", user.id);

        if (error) {
          failedOperations.push({ id: item.id, error: error.message });
        } else {
          acknowledgedIds.push(item.id);
        }
      } else {
        const row = AnnotationPersistenceMapper.toNotePersistence(domainItem);

        const { error } = await supabase
          .from("annotations")
          .update({
            body_markdown: row.body_markdown,
            location_anchor: row.location_anchor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("user_id", user.id);

        if (error) {
          failedOperations.push({ id: item.id, error: error.message });
        } else {
          acknowledgedIds.push(item.id);
        }
      }
    }

    // 4. Process Deletes
    for (const del of changes.deletes) {
      const table = del.type === "highlight" ? "highlights" : "annotations";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", del.id)
        .eq("user_id", user.id);

      if (error) {
        failedOperations.push({ id: del.id, error: error.message });
      } else {
        acknowledgedIds.push(del.id);
      }
    }

    return {
      success: true,
      data: {
        acknowledgedIds,
        failedOperations,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "Unknown error during pushAnnotationChanges" },
    };
  }
}
