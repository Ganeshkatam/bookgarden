import { DurableAnnotationQueue } from "./DurableAnnotationQueue";
import type { Annotation } from "../types/models";

describe("DurableAnnotationQueue", () => {
  let queue: DurableAnnotationQueue;

  beforeEach(() => {
    queue = new DurableAnnotationQueue();
  });

  it("should enqueue operations and retrieve them when eligible", () => {
    queue.enqueue({
      operationId: "op-1",
      entityType: "highlight",
      entityId: "hl-1",
      operation: "create",
    });

    const eligible = queue.getEligibleOperations();
    expect(eligible.length).toBe(1);
    expect(eligible[0].entityId).toBe("hl-1");
  });

  it("should deduplicate operations on the same entity and operation type", () => {
    queue.enqueue({
      operationId: "op-1",
      entityType: "annotation",
      entityId: "note-1",
      operation: "update",
      payload: { noteText: "First update" } as Annotation,
    });

    queue.enqueue({
      operationId: "op-2",
      entityType: "annotation",
      entityId: "note-1",
      operation: "update",
      payload: { noteText: "Second update" } as Annotation,
    });

    expect(queue.size()).toBe(1);
    const eligible = queue.getEligibleOperations();
    expect(eligible[0].payload?.noteText).toBe("Second update");
  });

  it("should sort highlight creation before annotation creation to protect foreign keys", () => {
    queue.enqueue({
      operationId: "op-note",
      entityType: "annotation",
      entityId: "note-1",
      operation: "create",
    });

    queue.enqueue({
      operationId: "op-hl",
      entityType: "highlight",
      entityId: "hl-1",
      operation: "create",
    });

    const eligible = queue.getEligibleOperations();
    expect(eligible.length).toBe(2);
    expect(eligible[0].entityType).toBe("highlight");
    expect(eligible[1].entityType).toBe("annotation");
  });

  it("should apply exponential backoff on failure and make operation ineligible immediately", () => {
    queue.enqueue({
      operationId: "op-1",
      entityType: "highlight",
      entityId: "hl-1",
      operation: "create",
    });

    queue.recordFailure("hl-1", "Temporary network failure");

    // Immediate check -> not eligible
    const immediate = queue.getEligibleOperations(new Date());
    expect(immediate.length).toBe(0);

    // After backoff interval -> eligible again
    const futureDate = new Date(Date.now() + 1500);
    const futureEligible = queue.getEligibleOperations(futureDate);
    expect(futureEligible.length).toBe(1);
    expect(futureEligible[0].attempts).toBe(1);
  });

  it("should remove acknowledged operations upon server success", () => {
    queue.enqueue({
      operationId: "op-1",
      entityType: "highlight",
      entityId: "hl-1",
      operation: "create",
    });

    queue.enqueue({
      operationId: "op-2",
      entityType: "annotation",
      entityId: "note-1",
      operation: "create",
    });

    queue.acknowledge(["hl-1"]);
    expect(queue.size()).toBe(1);

    const remaining = queue.getEligibleOperations();
    expect(remaining[0].entityId).toBe("note-1");
  });
});

