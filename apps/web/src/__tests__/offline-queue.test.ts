import { describe, it, expect, beforeEach } from "vitest";
import {
  getQueue,
  enqueue,
  updateOperation,
  dequeue,
  getPendingCount,
  shouldRetry,
  clearQueue,
  getOperationsToSync,
  type QueuedOperation,
} from "../lib/offline-queue";

describe("offline-queue", () => {
  describe("getQueue", () => {
    it("returns empty array initially", async () => {
      expect(await getQueue()).toEqual([]);
    });
  });

  describe("enqueue", () => {
    it("adds an operation to the queue", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      expect(op.type).toBe("ADD_LIST");
      expect(op.payload.deckId).toBe("d1");
      expect(op.status).toBe("pending");
      expect(op.retryCount).toBe(0);
      expect(op.id).toMatch(/^op_/);
    });

    it("creates unique IDs for each operation", async () => {
      const op1 = await enqueue("ADD_LIST", { deckId: "d1" });
      const op2 = await enqueue("ADD_LIST", { deckId: "d2" });
      expect(op1.id).not.toBe(op2.id);
    });

    it("appends to existing queue", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      await enqueue("REMOVE_LIST", { deckId: "d2" });
      const queue = await getQueue();
      expect(queue.length).toBe(2);
      expect(queue[0].type).toBe("ADD_LIST");
      expect(queue[1].type).toBe("REMOVE_LIST");
    });

    it("stores the snapshot for rollback", async () => {
      const snapshot = { myLists: [{ id: "d1", name: "Test" }] };
      const op = await enqueue("ADD_LIST", { deckId: "d1", snapshot });
      expect(op.payload.snapshot).toEqual(snapshot);
    });

    it("sets createdAt to current time", async () => {
      const before = Date.now();
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      const after = Date.now();
      expect(op.createdAt).toBeGreaterThanOrEqual(before);
      expect(op.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("updateOperation", () => {
    it("updates status of an existing operation", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "syncing" });
      const queue = await getQueue();
      expect(queue[0].status).toBe("syncing");
    });

    it("updates retryCount and lastError", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { retryCount: 3, lastError: "timeout" });
      const queue = await getQueue();
      expect(queue[0].retryCount).toBe(3);
      expect(queue[0].lastError).toBe("timeout");
    });

    it("does nothing for unknown operation id", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation("unknown-id", { status: "failed" });
      const queue = await getQueue();
      expect(queue[0].status).toBe("pending");
    });
  });

  describe("dequeue", () => {
    it("removes operation from queue", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await dequeue(op.id);
      expect(await getQueue()).toEqual([]);
    });

    it("only removes the specified operation", async () => {
      const op1 = await enqueue("ADD_LIST", { deckId: "d1" });
      const op2 = await enqueue("REMOVE_LIST", { deckId: "d2" });
      await dequeue(op1.id);
      const queue = await getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(op2.id);
    });

    it("does nothing for unknown id", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      await dequeue("unknown");
      expect((await getQueue()).length).toBe(1);
    });
  });

  describe("getPendingCount", () => {
    it("returns 0 for empty queue", async () => {
      expect(await getPendingCount()).toBe(0);
    });

    it("counts pending operations", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      await enqueue("ADD_LIST", { deckId: "d2" });
      expect(await getPendingCount()).toBe(2);
    });

    it("counts failed operations too", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "failed" });
      expect(await getPendingCount()).toBe(1);
    });

    it("does not count syncing operations", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "syncing" });
      expect(await getPendingCount()).toBe(0);
    });
  });

  describe("shouldRetry", () => {
    it("returns true when retryCount < 5", () => {
      const op = { retryCount: 0 } as QueuedOperation;
      expect(shouldRetry(op)).toBe(true);
    });

    it("returns true for retryCount = 4", () => {
      const op = { retryCount: 4 } as QueuedOperation;
      expect(shouldRetry(op)).toBe(true);
    });

    it("returns false when retryCount >= 5", () => {
      const op = { retryCount: 5 } as QueuedOperation;
      expect(shouldRetry(op)).toBe(false);
    });

    it("returns false when retryCount > 5", () => {
      const op = { retryCount: 10 } as QueuedOperation;
      expect(shouldRetry(op)).toBe(false);
    });
  });

  describe("clearQueue", () => {
    it("removes all operations", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      await enqueue("REMOVE_LIST", { deckId: "d2" });
      await enqueue("DELETE_DECK", { deckId: "d3" });
      await clearQueue();
      expect(await getQueue()).toEqual([]);
    });
  });

  describe("getOperationsToSync", () => {
    it("returns pending operations", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      const ops = await getOperationsToSync();
      expect(ops.length).toBe(1);
    });

    it("returns failed operations that can be retried", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "failed", retryCount: 2 });
      const ops = await getOperationsToSync();
      expect(ops.length).toBe(1);
    });

    it("excludes failed operations that exceeded max retries", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "failed", retryCount: 5 });
      const ops = await getOperationsToSync();
      expect(ops.length).toBe(0);
    });

    it("excludes syncing operations", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1" });
      await updateOperation(op.id, { status: "syncing" });
      const ops = await getOperationsToSync();
      expect(ops.length).toBe(0);
    });

    it("returns mixed pending and retryable failed", async () => {
      await enqueue("ADD_LIST", { deckId: "d1" });
      const op2 = await enqueue("REMOVE_LIST", { deckId: "d2" });
      await updateOperation(op2.id, { status: "failed", retryCount: 3 });
      const ops = await getOperationsToSync();
      expect(ops.length).toBe(2);
    });
  });

  describe("operation types", () => {
    it("supports ADD_LIST", async () => {
      const op = await enqueue("ADD_LIST", { deckId: "d1", icon: "star:#000" });
      expect(op.type).toBe("ADD_LIST");
      expect(op.payload.icon).toBe("star:#000");
    });

    it("supports REMOVE_LIST", async () => {
      const op = await enqueue("REMOVE_LIST", { deckId: "d1" });
      expect(op.type).toBe("REMOVE_LIST");
    });

    it("supports REORDER_LISTS", async () => {
      const op = await enqueue("REORDER_LISTS", { deckIds: ["a", "b", "c"] });
      expect(op.type).toBe("REORDER_LISTS");
      expect(op.payload.deckIds).toEqual(["a", "b", "c"]);
    });

    it("supports DELETE_DECK", async () => {
      const op = await enqueue("DELETE_DECK", { deckId: "d1" });
      expect(op.type).toBe("DELETE_DECK");
    });
  });
});
