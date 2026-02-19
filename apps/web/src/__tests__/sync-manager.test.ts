import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the api module
const mockAddList = vi.fn().mockResolvedValue(undefined);
const mockRemoveList = vi.fn().mockResolvedValue(undefined);
const mockReorderLists = vi.fn().mockResolvedValue(undefined);
const mockDeleteDeck = vi.fn().mockResolvedValue(undefined);

vi.mock("../lib/api", () => ({
  addList: (...args: any[]) => mockAddList(...args),
  removeList: (...args: any[]) => mockRemoveList(...args),
  reorderLists: (...args: any[]) => mockReorderLists(...args),
  deleteDeck: (...args: any[]) => mockDeleteDeck(...args),
}));

describe("sync-manager", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    mockAddList.mockReset().mockResolvedValue(undefined);
    mockRemoveList.mockReset().mockResolvedValue(undefined);
    mockReorderLists.mockReset().mockResolvedValue(undefined);
    mockDeleteDeck.mockReset().mockResolvedValue(undefined);
  });

  describe("isOnline", () => {
    it("returns true when navigator.onLine is true", async () => {
      const { isOnline } = await import("../lib/sync-manager");
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      expect(isOnline()).toBe(true);
    });

    it("returns false when navigator.onLine is false", async () => {
      const { isOnline } = await import("../lib/sync-manager");
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      expect(isOnline()).toBe(false);
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });
  });

  describe("getSyncStatus", () => {
    it("returns a valid status string", async () => {
      const { getSyncStatus } = await import("../lib/sync-manager");
      const status = getSyncStatus();
      expect(["idle", "syncing", "offline", "error"]).toContain(status);
    });
  });

  describe("subscribeSyncStatus", () => {
    it("returns an unsubscribe function", async () => {
      const { subscribeSyncStatus } = await import("../lib/sync-manager");
      const unsub = subscribeSyncStatus(() => {});
      expect(typeof unsub).toBe("function");
      unsub();
    });

    it("calls listener immediately with current status", async () => {
      const { subscribeSyncStatus } = await import("../lib/sync-manager");
      const listener = vi.fn();
      const unsub = subscribeSyncStatus(listener);
      await new Promise(r => setTimeout(r, 50));
      expect(listener).toHaveBeenCalled();
      unsub();
    });
  });

  describe("processQueue", () => {
    it("processes pending operations successfully", async () => {
      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      const queue = await getQueue();
      expect(queue.length).toBe(0);
    });

    it("sets status to offline when not online", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });

      const { processQueue, getSyncStatus } = await import("../lib/sync-manager");
      await processQueue();

      await new Promise(r => setTimeout(r, 50));
      expect(getSyncStatus()).toBe("offline");

      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });

    it("calls correct API function for each operation type", async () => {
      const { enqueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1", icon: "star:#fff" });
      await processQueue();
      expect(mockAddList).toHaveBeenCalledWith("d1", "star:#fff");

      mockAddList.mockClear();
      await enqueue("REMOVE_LIST", { deckId: "d2" });
      await processQueue();
      expect(mockRemoveList).toHaveBeenCalledWith("d2");

      await enqueue("REORDER_LISTS", { deckIds: ["a", "b"] });
      await processQueue();
      expect(mockReorderLists).toHaveBeenCalledWith(["a", "b"]);

      await enqueue("DELETE_DECK", { deckId: "d3" });
      await processQueue();
      expect(mockDeleteDeck).toHaveBeenCalledWith("d3");
    });
  });

  describe("retry logic", () => {
    it("increments retryCount on failure", async () => {
      mockAddList.mockRejectedValue(new Error("network error"));
      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      const queue = await getQueue();
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].status).toBe("failed");
      expect(queue[0].lastError).toBe("network error");
    });

    it("rollbacks and dequeues after max retries (5)", async () => {
      mockAddList.mockRejectedValue(new Error("server error"));
      const { enqueue, getQueue, updateOperation } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      const op = await enqueue("ADD_LIST", {
        deckId: "d1",
        snapshot: { myLists: [{ id: "original" }] },
      });

      // Set retryCount to 4 so after increment to 5, shouldRetry returns false → rollback
      await updateOperation(op.id, { retryCount: 4, status: "failed" });
      await processQueue();

      // Operation should be dequeued after rollback
      const queue = await getQueue();
      expect(queue.length).toBe(0);

      // Snapshot should be restored
      const store = (globalThis as any).__idbStore;
      const cached = store.get("cache:my-lists");
      expect(cached.data).toEqual([{ id: "original" }]);
    });

    it("dequeues operation after successful sync", async () => {
      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();
      const queue = await getQueue();
      expect(queue.length).toBe(0);
    });
  });

  describe("401 auth-expired handling (BUG 6)", () => {
    it("dispatches auth-expired event on 401", async () => {
      mockAddList.mockRejectedValue(new Error("Session expirée, veuillez vous reconnecter"));
      const handler = vi.fn();
      window.addEventListener("auth-expired", handler);

      const { enqueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener("auth-expired", handler);
    });

    it("does not retry on 401", async () => {
      mockAddList.mockRejectedValue(new Error("Session expirée, veuillez vous reconnecter"));

      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      // Should NOT have retried - retryCount stays 0, status is failed
      const queue = await getQueue();
      expect(queue[0].status).toBe("failed");
      expect(mockAddList).toHaveBeenCalledTimes(1);
    });

    it("stops processing remaining operations on 401", async () => {
      mockAddList.mockRejectedValue(new Error("Session expirée, veuillez vous reconnecter"));

      const { enqueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await enqueue("REMOVE_LIST", { deckId: "d2" });
      await processQueue();

      expect(mockAddList).toHaveBeenCalledTimes(1);
      expect(mockRemoveList).not.toHaveBeenCalled();
    });
  });

  describe("404 on DELETE_DECK (BUG 10)", () => {
    it("treats 404 on DELETE_DECK as success", async () => {
      mockDeleteDeck.mockRejectedValue(new Error("Élément introuvable"));

      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("DELETE_DECK", { deckId: "d1" });
      await processQueue();

      const queue = await getQueue();
      expect(queue.length).toBe(0); // dequeued as success
    });

    it("does NOT treat 404 on ADD_LIST as success", async () => {
      mockAddList.mockRejectedValue(new Error("Élément introuvable"));

      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      const queue = await getQueue();
      expect(queue.length).toBe(1); // still in queue for retry
    });
  });

  describe("sync-operation-failed event (BUG 9)", () => {
    it("dispatches event on max retries reached", async () => {
      mockAddList.mockRejectedValue(new Error("Server error"));
      const handler = vi.fn();
      window.addEventListener("sync-operation-failed", handler);

      const { enqueue, updateOperation } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      const op = await enqueue("ADD_LIST", { deckId: "d1", snapshot: {} });
      // retryCount=4 so after increment to 5, shouldRetry returns false → rollback + event
      await updateOperation(op.id, { retryCount: 4, status: "failed" });
      await processQueue();

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.operationType).toBe("ADD_LIST");
      expect(detail.lastError).toBe("Server error");

      window.removeEventListener("sync-operation-failed", handler);
    });
  });

  describe("sync-rollback event (BUG 5)", () => {
    it("dispatches sync-rollback event on rollback", async () => {
      mockRemoveList.mockRejectedValue(new Error("Server error"));
      const handler = vi.fn();
      window.addEventListener("sync-rollback", handler);

      const { enqueue, updateOperation } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      const op = await enqueue("REMOVE_LIST", {
        deckId: "d1",
        snapshot: { myLists: [{ id: "d1" }] },
      });
      await updateOperation(op.id, { retryCount: 4, status: "failed" });
      await processQueue();

      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.operationType).toBe("REMOVE_LIST");

      window.removeEventListener("sync-rollback", handler);
    });

    it("restores snapshot data on rollback", async () => {
      mockRemoveList.mockRejectedValue(new Error("Server error"));
      const store = (globalThis as any).__idbStore;

      const { enqueue, updateOperation } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      const op = await enqueue("REMOVE_LIST", {
        deckId: "d1",
        snapshot: {
          myLists: [{ id: "d1", name: "My Deck" }],
          allLists: [{ id: "d2", name: "Public" }],
        },
      });
      await updateOperation(op.id, { retryCount: 4, status: "failed" });
      await processQueue();

      expect(store.get("cache:my-lists").data).toEqual([{ id: "d1", name: "My Deck" }]);
      expect(store.get("cache:all-lists").data).toEqual([{ id: "d2", name: "Public" }]);
    });
  });

  describe("orphaned syncing operations (BUG 8)", () => {
    it("resets syncing operations to pending on init", async () => {
      const { enqueue, updateOperation, getOperationsToSync } = await import("../lib/offline-queue");
      const { initSyncManager } = await import("../lib/sync-manager");

      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "syncing" });

      // Before init, syncing ops are excluded
      const before = await getOperationsToSync();
      expect(before.length).toBe(0);

      // Go offline so processQueue doesn't consume the ops after reset
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

      const cleanup = initSyncManager();
      await new Promise(r => setTimeout(r, 100));

      const after = await getOperationsToSync();
      expect(after.length).toBe(1);
      expect(after[0].status).toBe("pending");

      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      cleanup();
    });
  });

  describe("syncInProgress recheck (BUG 3)", () => {
    it("processes new operations enqueued during sync", async () => {
      const { enqueue, getQueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      let callCount = 0;
      mockAddList.mockImplementation(async (deckId: string) => {
        callCount++;
        if (callCount === 1) {
          await enqueue("ADD_LIST", { deckId: "d2" });
        }
      });

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      const queue = await getQueue();
      expect(queue.length).toBe(0);
      expect(callCount).toBe(2);
    });
  });

  describe("FIFO ordering", () => {
    it("processes operations in order", async () => {
      const callOrder: string[] = [];
      mockAddList.mockImplementation(async (deckId: string) => {
        callOrder.push(deckId);
      });

      const { enqueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "first" });
      await enqueue("ADD_LIST", { deckId: "second" });
      await enqueue("ADD_LIST", { deckId: "third" });

      await processQueue();

      expect(callOrder).toEqual(["first", "second", "third"]);
    });
  });
});
