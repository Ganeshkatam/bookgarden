import type { Annotation } from "../types/models";

export type SyncOperationType = "create" | "update" | "delete";

export interface AnnotationSyncOperation {
  operationId: string;
  entityType: "annotation" | "highlight";
  entityId: string;
  operation: SyncOperationType;
  payload?: Annotation;
  attempts: number;
  nextAttemptAt: string;
  createdAt: string;
  error?: string;
}

export class DurableAnnotationQueue {
  private queue: Map<string, AnnotationSyncOperation> = new Map();
  private maxAttempts = 5;

  /**
   * Adds or deduplicates an operation in the queue.
   */
  public enqueue(
    operation: Omit<
      AnnotationSyncOperation,
      "attempts" | "nextAttemptAt" | "createdAt"
    >,
  ): void {
    const key = `${operation.entityType}_${operation.entityId}_${operation.operation}`;
    const existing = this.queue.get(key);

    if (existing) {
      // Deduplicate payload with latest state
      if (operation.payload) {
        existing.payload = operation.payload;
      }
      return;
    }

    this.queue.set(key, {
      ...operation,
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Returns all operations eligible for immediate execution.
   */
  public getEligibleOperations(
    now: Date = new Date(),
  ): AnnotationSyncOperation[] {
    const eligible: AnnotationSyncOperation[] = [];

    for (const op of this.queue.values()) {
      if (op.attempts < this.maxAttempts) {
        if (new Date(op.nextAttemptAt) <= now) {
          eligible.push(op);
        }
      }
    }

    // Sort to ensure highlights are synchronized before notes
    return eligible.sort((a, b) => {
      if (a.entityType === "highlight" && b.entityType === "annotation") {
        return -1;
      }
      if (a.entityType === "annotation" && b.entityType === "highlight") {
        return 1;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Acknowledges successful execution and removes operations from the queue.
   */
  public acknowledge(entityIds: string[]): void {
    const idSet = new Set(entityIds);
    for (const [key, op] of this.queue.entries()) {
      if (idSet.has(op.entityId)) {
        this.queue.delete(key);
      }
    }
  }

  /**
   * Records a failed attempt and computes exponential backoff with jitter.
   */
  public recordFailure(entityId: string, error: string): void {
    for (const op of this.queue.values()) {
      if (op.entityId === entityId) {
        op.attempts += 1;
        op.error = error;

        // Exponential backoff: base 1s, 2s, 4s, 8s, 16s + jitter (0-200ms)
        const baseSeconds = Math.pow(2, op.attempts - 1);
        const jitterMs = Math.floor(Math.random() * 200);
        const delayMs = baseSeconds * 1000 + jitterMs;

        op.nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
        break;
      }
    }
  }

  public size(): number {
    return this.queue.size;
  }

  public clear(): void {
    this.queue.clear();
  }
}

