import { AnnotationSyncService } from "./annotation-sync";
import { useAnnotationStore } from "../state/annotation-store";
import * as syncActions from "../actions/sync";
import type { Annotation } from "../types/models";
import type { TextRangeAnchor } from "../../application/ports/AnnotationAnchor";

jest.mock("../actions/sync");

describe("AnnotationSyncService Integration & Recovery", () => {
  const bookId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";
  let service: AnnotationSyncService;

  const sampleAnchor: TextRangeAnchor = {
    type: "text",
    pageNumber: 1,
    startOffset: 0,
    endOffset: 10,
    rects: [],
    textQuote: "Sample text",
  };

  beforeEach(() => {
    useAnnotationStore.setState({ annotations: {}, activeAnnotationId: null });
    service = new AnnotationSyncService(bookId, userId);
    jest.clearAllMocks();
  });

  it("should pull remote annotations and populate the store directly", async () => {
    const mockRemoteAnnotations: Annotation[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        bookId,
        userId,
        type: "highlight",
        anchor: sampleAnchor,
        color: "yellow",
        selectedText: "Sample text",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        syncState: "synced",
      },
    ];

    (syncActions.fetchAnnotations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockRemoteAnnotations,
    });

    await service.pullRemote();

    const storeState = useAnnotationStore.getState();
    expect(Object.keys(storeState.annotations).length).toBe(1);
    expect(storeState.annotations["11111111-1111-4111-8111-111111111111"]).toBeDefined();
    expect(storeState.annotations["11111111-1111-4111-8111-111111111111"].type).toBe("highlight");
  });

  it("should push pending creation, receive acknowledgment, and mark item as synced", async () => {
    const testId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    useAnnotationStore.setState({
      annotations: {
        [testId]: {
          id: testId,
          bookId,
          userId,
          type: "highlight",
          anchor: sampleAnchor,
          color: "green",
          selectedText: "Green highlighted text",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          syncState: "pending_create",
        },
      },
    });

    (syncActions.pushAnnotationChanges as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        acknowledgedIds: [testId],
        failedOperations: [],
      },
    });

    await service.pushPending();

    expect(syncActions.pushAnnotationChanges).toHaveBeenCalledTimes(1);
    const storeState = useAnnotationStore.getState();
    expect(storeState.annotations[testId].syncState).toBe("synced");
  });

  it("should retry with backoff on failure and preserve pending state until acknowledged", async () => {
    const testId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    useAnnotationStore.setState({
      annotations: {
        [testId]: {
          id: testId,
          bookId,
          userId,
          type: "note",
          anchor: sampleAnchor,
          noteText: "Pending note commentary",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          syncState: "pending_create",
        },
      },
    });

    (syncActions.pushAnnotationChanges as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { message: "Network timeout" },
    });

    await service.pushPending();

    const storeState = useAnnotationStore.getState();
    expect(storeState.annotations[testId].syncState).toBe("pending_create");

    // Immediate push is suppressed by queue backoff
    await service.pushPending();
    expect(syncActions.pushAnnotationChanges).toHaveBeenCalledTimes(1);
  });

  it("should remove deleted items from store upon server deletion acknowledgment", async () => {
    const testId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    useAnnotationStore.setState({
      annotations: {
        [testId]: {
          id: testId,
          bookId,
          userId,
          type: "highlight",
          anchor: sampleAnchor,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          syncState: "pending_delete",
        },
      },
    });

    (syncActions.pushAnnotationChanges as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        acknowledgedIds: [testId],
        failedOperations: [],
      },
    });

    await service.pushPending();

    const storeState = useAnnotationStore.getState();
    expect(storeState.annotations[testId]).toBeUndefined();
  });
});
