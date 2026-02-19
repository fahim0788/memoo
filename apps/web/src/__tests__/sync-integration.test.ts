/**
 * Integration tests for the offline-first sync system
 * Tests cross-module scenarios: race conditions, dedup, data isolation, network recovery
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api module
const mockAddList = vi.fn().mockResolvedValue(undefined);
const mockRemoveList = vi.fn().mockResolvedValue(undefined);
const mockReorderLists = vi.fn().mockResolvedValue(undefined);
const mockDeleteDeck = vi.fn().mockResolvedValue(undefined);
const mockPushReviews = vi.fn().mockResolvedValue({ ok: true, created: 1, serverTime: Date.now() });
const mockFetchLists = vi.fn().mockResolvedValue([]);
const mockFetchMyLists = vi.fn().mockResolvedValue([]);
const mockFetchAvailablePersonalDecks = vi.fn().mockResolvedValue([]);
const mockFetchCards = vi.fn().mockResolvedValue([]);

vi.mock("../lib/api", () => ({
  addList: (...args: any[]) => mockAddList(...args),
  removeList: (...args: any[]) => mockRemoveList(...args),
  reorderLists: (...args: any[]) => mockReorderLists(...args),
  deleteDeck: (...args: any[]) => mockDeleteDeck(...args),
  pushReviews: (...args: any[]) => mockPushReviews(...args),
  fetchLists: (...args: any[]) => mockFetchLists(...args),
  fetchMyLists: (...args: any[]) => mockFetchMyLists(...args),
  fetchAvailablePersonalDecks: (...args: any[]) => mockFetchAvailablePersonalDecks(...args),
  fetchCards: (...args: any[]) => mockFetchCards(...args),
}));

vi.mock("../lib/auth", () => ({
  getToken: vi.fn(() => "fake-token"),
  clearToken: vi.fn(),
  logout: vi.fn(),
}));

beforeEach(() => {
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  mockAddList.mockReset().mockResolvedValue(undefined);
  mockRemoveList.mockReset().mockResolvedValue(undefined);
  mockReorderLists.mockReset().mockResolvedValue(undefined);
  mockDeleteDeck.mockReset().mockResolvedValue(undefined);
  mockPushReviews.mockReset().mockResolvedValue({ ok: true, created: 1, serverTime: Date.now() });
  mockFetchLists.mockReset().mockResolvedValue([]);
  mockFetchMyLists.mockReset().mockResolvedValue([]);
  mockFetchAvailablePersonalDecks.mockReset().mockResolvedValue([]);
  mockFetchCards.mockReset().mockResolvedValue([]);
});

describe("Race condition tests (BUG 1)", () => {
  it("concurrent enqueue operations do not lose data", async () => {
    const { enqueue, getQueue } = await import("../lib/offline-queue");

    // Fire 10 concurrent enqueues
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        enqueue("ADD_LIST", { deckId: `d${i}` })
      )
    );

    const queue = await getQueue();
    expect(queue.length).toBe(10);

    // Each deck should be present
    const deckIds = queue.map(op => op.payload.deckId);
    for (let i = 0; i < 10; i++) {
      expect(deckIds).toContain(`d${i}`);
    }
  });

  it("concurrent enqueue and dequeue do not corrupt queue", async () => {
    const { enqueue, dequeue, getQueue } = await import("../lib/offline-queue");

    const op1 = await enqueue("ADD_LIST", { deckId: "d1" });
    const op2 = await enqueue("ADD_LIST", { deckId: "d2" });

    // Concurrent dequeue and enqueue
    await Promise.all([
      dequeue(op1.id),
      enqueue("ADD_LIST", { deckId: "d3" }),
    ]);

    const queue = await getQueue();
    // Should have op2 and d3, not op1
    expect(queue.length).toBe(2);
    expect(queue.find(op => op.id === op1.id)).toBeUndefined();
    expect(queue.find(op => op.payload.deckId === "d2")).toBeTruthy();
    expect(queue.find(op => op.payload.deckId === "d3")).toBeTruthy();
  });

  it("all operations get unique IDs", async () => {
    const { enqueue, getQueue } = await import("../lib/offline-queue");

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        enqueue("ADD_LIST", { deckId: `d${i}` })
      )
    );

    const queue = await getQueue();
    const ids = new Set(queue.map(op => op.id));
    expect(ids.size).toBe(20); // All unique
  });
});

describe("Review sync deduplication (BUG 4)", () => {
  it("replaces existing review for same card (AI upgrade)", async () => {
    // Reject pushReviews so background flushQueue doesn't clear the queue
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview, getPendingCount } = await import("../lib/sync");

    // User reviews card, then AI upgrades the answer
    await queueReview({ cardId: "c1", ok: false, userAnswer: "Paris" });
    await queueReview({ cardId: "c1", ok: true, userAnswer: "Paris" });

    // Wait for background flushQueue attempts to settle
    await new Promise(r => setTimeout(r, 50));

    const count = await getPendingCount();
    expect(count).toBe(1); // Deduplicated

    const store = (globalThis as any).__idbStore;
    const queue = store.get("sync_queue");
    expect(queue.reviews[0].ok).toBe(true); // The upgraded version
  });

  it("keeps separate reviews for different cards", async () => {
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview, getPendingCount } = await import("../lib/sync");

    await queueReview({ cardId: "c1", ok: true, userAnswer: "Paris" });
    await queueReview({ cardId: "c2", ok: false, userAnswer: "London" });

    await new Promise(r => setTimeout(r, 50));

    const count = await getPendingCount();
    expect(count).toBe(2);
  });

  it("adds reviewId to each review", async () => {
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview } = await import("../lib/sync");

    await queueReview({ cardId: "c1", ok: true, userAnswer: "test" });
    await new Promise(r => setTimeout(r, 50));

    const store = (globalThis as any).__idbStore;
    const queue = store.get("sync_queue");
    expect(queue.reviews[0].reviewId).toMatch(/^rev_/);
  });

  it("sets reviewedAt timestamp", async () => {
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview } = await import("../lib/sync");

    const before = Date.now();
    await queueReview({ cardId: "c1", ok: true, userAnswer: "test" });
    const after = Date.now();
    await new Promise(r => setTimeout(r, 50));

    const store = (globalThis as any).__idbStore;
    const queue = store.get("sync_queue");
    expect(queue.reviews[0].reviewedAt).toBeGreaterThanOrEqual(before);
    expect(queue.reviews[0].reviewedAt).toBeLessThanOrEqual(after);
  });
});

describe("Cross-account data isolation (BUG 7)", () => {
  it("clearQueue + clearCache + clearReviewQueue empties all IDB data", async () => {
    // Reject pushReviews so background flush doesn't clear the review queue
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const store = (globalThis as any).__idbStore;
    const { enqueue } = await import("../lib/offline-queue");
    const { queueReview } = await import("../lib/sync");

    // Simulate user data
    store.set("cache:my-lists", { data: [{ id: "d1" }], timestamp: Date.now() });
    store.set("cache:all-lists", { data: [{ id: "d2" }], timestamp: Date.now() });
    store.set("cache:available-personal", { data: [], timestamp: Date.now() });
    await enqueue("ADD_LIST", { deckId: "d1" });

    await queueReview({ cardId: "c1", ok: true, userAnswer: "test" });
    await new Promise(r => setTimeout(r, 50));

    localStorage.setItem("chapter-progress", JSON.stringify({ d1: { ch1: 2 } }));

    // Verify data exists
    expect(store.get("cache:my-lists")).toBeTruthy();
    expect(store.get("offline:operations-queue")).toBeTruthy();
    expect(store.get("sync_queue")).toBeTruthy();

    // Clear all
    const { clearQueue } = await import("../lib/offline-queue");
    const { clearCache } = await import("../lib/api-cache");
    const { clearReviewQueue } = await import("../lib/sync");

    await Promise.all([clearQueue(), clearCache(), clearReviewQueue()]);
    localStorage.removeItem("chapter-progress");

    // Verify everything is cleared
    expect(store.get("cache:my-lists")).toBeUndefined();
    expect(store.get("cache:all-lists")).toBeUndefined();
    expect(store.get("cache:available-personal")).toBeUndefined();

    const { getQueue } = await import("../lib/offline-queue");
    const queue = await getQueue();
    expect(queue.length).toBe(0);

    const { getPendingCount } = await import("../lib/sync");
    const reviewCount = await getPendingCount();
    expect(reviewCount).toBe(0);

    expect(localStorage.getItem("chapter-progress")).toBeNull();
  });
});

describe("Network recovery", () => {
  it("processQueue syncs pending operations when back online", async () => {
    const { enqueue, getQueue } = await import("../lib/offline-queue");
    const { processQueue } = await import("../lib/sync-manager");

    // Go offline, enqueue
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await enqueue("ADD_LIST", { deckId: "d1" });

    // processQueue should skip when offline
    await processQueue();
    let queue = await getQueue();
    expect(queue.length).toBe(1);

    // Come back online
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await processQueue();

    queue = await getQueue();
    expect(queue.length).toBe(0);
    expect(mockAddList).toHaveBeenCalledWith("d1", undefined);
  });

  it("operations remain in queue after failed sync", async () => {
    mockAddList.mockRejectedValue(new Error("server error"));
    const { enqueue, getQueue } = await import("../lib/offline-queue");
    const { processQueue } = await import("../lib/sync-manager");

    await enqueue("ADD_LIST", { deckId: "d1" });
    await processQueue();

    const queue = await getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe("failed");
    expect(queue[0].retryCount).toBe(1);
  });
});

describe("Review flush", () => {
  it("flushQueue sends batch POST and clears queue", async () => {
    // Reject during queueReview so background flush doesn't clear queue
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview, flushQueue, getPendingCount } = await import("../lib/sync");

    await queueReview({ cardId: "c1", ok: true, userAnswer: "Paris" });
    await queueReview({ cardId: "c2", ok: false, userAnswer: "London" });

    // Wait for background flushes to settle (they fail)
    await new Promise(r => setTimeout(r, 50));

    // Now set pushReviews to succeed and call flushQueue explicitly
    mockPushReviews.mockReset().mockResolvedValue({ ok: true, created: 2, serverTime: Date.now() });

    const synced = await flushQueue();
    expect(synced).toBe(2);
    expect(mockPushReviews).toHaveBeenCalledTimes(1);

    // Reviews array should have 2 items sent
    const sentReviews = mockPushReviews.mock.calls[0][0];
    expect(sentReviews.length).toBe(2);

    // Queue should be cleared
    const pending = await getPendingCount();
    expect(pending).toBe(0);
  });

  it("reviews stay in queue on flush failure", async () => {
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const { queueReview, flushQueue, getPendingCount } = await import("../lib/sync");

    await queueReview({ cardId: "c1", ok: true, userAnswer: "test" });

    // Wait for background flush to settle (fails)
    await new Promise(r => setTimeout(r, 50));

    // Explicit flush also fails
    mockPushReviews.mockRejectedValue(new Error("network error"));
    await expect(flushQueue()).rejects.toThrow("network error");

    const pending = await getPendingCount();
    expect(pending).toBe(1); // Still in queue
  });

  it("returns 0 when queue is empty", async () => {
    const { flushQueue } = await import("../lib/sync");
    const result = await flushQueue();
    expect(result).toBe(0);
    expect(mockPushReviews).not.toHaveBeenCalled();
  });
});

describe("Multi-operation scenarios", () => {
  it("handles add then remove same deck offline", async () => {
    const { enqueue, getQueue } = await import("../lib/offline-queue");
    const { processQueue } = await import("../lib/sync-manager");

    await enqueue("ADD_LIST", { deckId: "d1" });
    await enqueue("REMOVE_LIST", { deckId: "d1" });

    await processQueue();

    const queue = await getQueue();
    expect(queue.length).toBe(0);
    expect(mockAddList).toHaveBeenCalledTimes(1);
    expect(mockRemoveList).toHaveBeenCalledTimes(1);
  });

  it("handles multiple reorders offline", async () => {
    const { enqueue, getQueue } = await import("../lib/offline-queue");
    const { processQueue } = await import("../lib/sync-manager");

    await enqueue("REORDER_LISTS", { deckIds: ["a", "b", "c"] });
    await enqueue("REORDER_LISTS", { deckIds: ["c", "a", "b"] });

    await processQueue();

    const queue = await getQueue();
    expect(queue.length).toBe(0);
    expect(mockReorderLists).toHaveBeenCalledTimes(2);
    // Second call should be the last reorder
    expect(mockReorderLists.mock.calls[1][0]).toEqual(["c", "a", "b"]);
  });

  it("processes mixed operation types in FIFO order", async () => {
    const callOrder: string[] = [];
    mockAddList.mockImplementation(async () => { callOrder.push("add"); });
    mockRemoveList.mockImplementation(async () => { callOrder.push("remove"); });
    mockDeleteDeck.mockImplementation(async () => { callOrder.push("delete"); });

    const { enqueue } = await import("../lib/offline-queue");
    const { processQueue } = await import("../lib/sync-manager");

    await enqueue("ADD_LIST", { deckId: "d1" });
    await enqueue("REMOVE_LIST", { deckId: "d2" });
    await enqueue("DELETE_DECK", { deckId: "d3" });

    await processQueue();

    expect(callOrder).toEqual(["add", "remove", "delete"]);
  });
});

describe("Optimistic update with cache", () => {
  it("addList updates cache before enqueue", async () => {
    const store = (globalThis as any).__idbStore;
    store.set("cache:my-lists", { data: [], timestamp: Date.now() });
    store.set("cache:all-lists", {
      data: [{ id: "d1", name: "Test Deck", cardCount: 5 }],
      timestamp: Date.now(),
    });

    const { addList } = await import("../lib/api-cache");
    await addList("d1", "star:#ff0000");

    // Cache should be updated optimistically
    const myLists = store.get("cache:my-lists");
    expect(myLists.data.length).toBe(1);
    expect(myLists.data[0].id).toBe("d1");
    expect(myLists.data[0].icon).toBe("star:#ff0000");

    // Deck should be removed from all-lists
    const allLists = store.get("cache:all-lists");
    expect(allLists.data.length).toBe(0);
  });

  it("removeList moves deck back to appropriate list", async () => {
    const store = (globalThis as any).__idbStore;
    store.set("cache:my-lists", {
      data: [{ id: "d1", name: "Public Deck", cardCount: 5, isOwned: false }],
      timestamp: Date.now(),
    });
    store.set("cache:all-lists", { data: [], timestamp: Date.now() });

    const { removeList } = await import("../lib/api-cache");
    await removeList("d1");

    const myLists = store.get("cache:my-lists");
    expect(myLists.data.length).toBe(0);

    // Public deck goes back to all-lists
    const allLists = store.get("cache:all-lists");
    expect(allLists.data.length).toBe(1);
    expect(allLists.data[0].id).toBe("d1");
  });

  it("deleteDeck removes from both my-lists and available-personal", async () => {
    const store = (globalThis as any).__idbStore;
    store.set("cache:my-lists", {
      data: [{ id: "d1", name: "My Deck", cardCount: 3 }],
      timestamp: Date.now(),
    });
    store.set("cache:available-personal", {
      data: [{ id: "d2", name: "Other Deck", cardCount: 2 }],
      timestamp: Date.now(),
    });
    store.set("cache:cards:d1", { data: [{ id: "c1" }], timestamp: Date.now() });

    const { deleteDeck } = await import("../lib/api-cache");
    await deleteDeck("d1");

    const myLists = store.get("cache:my-lists");
    expect(myLists.data.length).toBe(0);

    // Cards cache cleared
    expect(store.get("cache:cards:d1")).toBeUndefined();

    // Available personal unchanged (d2 still there)
    const available = store.get("cache:available-personal");
    expect(available.data.length).toBe(1);
    expect(available.data[0].id).toBe("d2");
  });

  it("reorderLists updates cache with new order", async () => {
    const store = (globalThis as any).__idbStore;
    store.set("cache:my-lists", {
      data: [
        { id: "a", name: "A", cardCount: 1 },
        { id: "b", name: "B", cardCount: 2 },
        { id: "c", name: "C", cardCount: 3 },
      ],
      timestamp: Date.now(),
    });

    const { reorderLists } = await import("../lib/api-cache");
    await reorderLists(["c", "a", "b"]);

    const myLists = store.get("cache:my-lists");
    expect(myLists.data.map((d: any) => d.id)).toEqual(["c", "a", "b"]);
  });
});

describe("clearReviewQueue", () => {
  it("clears review queue and last sync time", async () => {
    // Reject pushReviews so background flush doesn't write last_sync
    mockPushReviews.mockRejectedValue(new Error("offline"));
    const store = (globalThis as any).__idbStore;
    const { queueReview, clearReviewQueue, getPendingCount, getLastSyncTime } = await import("../lib/sync");

    await queueReview({ cardId: "c1", ok: true, userAnswer: "test" });

    // Wait for background flush to settle (fails)
    await new Promise(r => setTimeout(r, 50));

    // Set a fake last sync time
    store.set("last_sync", 1234567890);

    await clearReviewQueue();

    const count = await getPendingCount();
    expect(count).toBe(0);

    const lastSync = await getLastSyncTime();
    expect(lastSync).toBeNull();
  });
});
