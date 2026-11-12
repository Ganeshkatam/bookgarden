import { fetchAnnotations, pushAnnotationChanges } from "../actions/sync";
import type { Annotation } from "../types/models";
import { useAnnotationStore } from "../state/annotation-store";
import { DurableAnnotationQueue } from "./DurableAnnotationQueue";

/**
 *  ANNOTATION SYNC ENGINE
 *
 * This service handles pushing pending annotations to the backend and
 * pulling remote annotations down.
 *
 * Runs with durable queue ordering, exponential backoff, and idempotent UUID keys.
 */
export class AnnotationSyncService {
  private bookId: string;
  private userId: string;
  private isSyncing = false;
  private queue = new DurableAnnotationQueue();

  constructor(bookId: string, userId: string) {
    this.bookId = bookId;
    this.userId = userId;
  }

  /**
   * Pulls the latest annotations from the backend and initializes the store.
   */
  async pullRemote(): Promise<void> {
    try {
      const res = await fetchAnnotations(this.bookId);

      if (res.success && res.data) {
        useAnnotationStore.getState().setAnnotations(res.data);
      }
    } catch (err) {
      console.error("Failed to pull annotations:", err);
    }
  }

  /**
   * Pushes any pending creations, updates, or deletions to the backend via the durable queue.
   */
  async pushPending(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const store = useAnnotationStore.getState();
    const pendingAnnotations = Object.values(store.annotations).filter(
      (a) => a.syncState !== "synced",
    );

    // Enqueue pending changes into durable queue
    for (const annotation of pendingAnnotations) {
      const entityType = annotation.type === "highlight" ? "highlight" : "annotation";
      if (annotation.syncState === "pending_create") {
        this.queue.enqueue({
          operationId: `op_create_${annotation.id}`,
          entityType,
          entityId: annotation.id,
          operation: "create",
          payload: annotation,
        });
      } else if (annotation.syncState === "pending_update") {
        this.queue.enqueue({
          operationId: `op_update_${annotation.id}`,
          entityType,
          entityId: annotation.id,
          operation: "update",
          payload: annotation,
        });
      } else if (annotation.syncState === "pending_delete") {
        this.queue.enqueue({
          operationId: `op_delete_${annotation.id}`,
          entityType,
          entityId: annotation.id,
          operation: "delete",
        });
      }
    }

    const eligible = this.queue.getEligibleOperations();
    if (eligible.length === 0) {
      this.isSyncing = false;
      return;
    }

    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    for (const op of eligible) {
      if (op.operation === "create" && op.payload) {
        creates.push({
          id: op.payload.id,
          bookId: op.payload.bookId,
          userId: op.payload.userId,
          type: op.payload.type,
          anchor: op.payload.anchor,
          color: op.payload.color,
          selectedText: op.payload.selectedText,
          noteText: op.payload.noteText,
          highlightId: op.payload.highlightId ?? null,
          createdAt: op.payload.createdAt,
          updatedAt: op.payload.updatedAt,
        });
      } else if (op.operation === "update" && op.payload) {
        updates.push({
          id: op.payload.id,
          bookId: op.payload.bookId,
          userId: op.payload.userId,
          type: op.payload.type,
          anchor: op.payload.anchor,
          color: op.payload.color,
          selectedText: op.payload.selectedText,
          noteText: op.payload.noteText,
          highlightId: op.payload.highlightId ?? null,
          updatedAt: new Date().toISOString(),
        });
      } else if (op.operation === "delete") {
        deletes.push({
          id: op.entityId,
          type: op.entityType === "highlight" ? "highlight" : "note",
        });
      }
    }

    try {
      const res = await pushAnnotationChanges({ creates, updates, deletes });

      if (res.success) {
        // Acknowledge successes in durable queue
        this.queue.acknowledge(res.data.acknowledgedIds);

        // Update local store sync states
        for (const ackId of res.data.acknowledgedIds) {
          const ann = store.annotations[ackId];
          if (ann && ann.syncState === "pending_delete") {
            store.removeAnnotation(ackId);
          } else if (ann) {
            store.updateAnnotation(ackId, { syncState: "synced" });
          }
        }

        // Record failures for exponential backoff retry
        for (const failure of res.data.failedOperations) {
          this.queue.recordFailure(failure.id, failure.error);
        }
      } else {
        const errorMsg = res.error?.message || "Unknown push error";
        console.error("[AnnotationSyncService] Failed to push changes:", errorMsg);
        for (const op of eligible) {
          this.queue.recordFailure(op.entityId, errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Network exception during sync";
      console.error("[AnnotationSyncService] Exception during push:", err);
      for (const op of eligible) {
        this.queue.recordFailure(op.entityId, errorMsg);
      }
    }

    this.isSyncing = false;
  }
}
