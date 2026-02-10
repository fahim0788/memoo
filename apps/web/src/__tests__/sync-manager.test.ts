import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isOnline, getSyncStatus, subscribeSyncStatus } from "../lib/sync-manager";

// Mock the api module to prevent actual network calls
vi.mock("../lib/api", () => ({
  addList: vi.fn().mockResolvedValue(undefined),
  removeList: vi.fn().mockResolvedValue(undefined),
  reorderLists: vi.fn().mockResolvedValue(undefined),
  deleteDeck: vi.fn().mockResolvedValue(undefined),
}));

describe("sync-manager", () => {
  describe("isOnline", () => {
    it("returns true when navigator.onLine is true", () => {
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      expect(isOnline()).toBe(true);
    });

    it("returns false when navigator.onLine is false", () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      expect(isOnline()).toBe(false);
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });
  });

  describe("getSyncStatus", () => {
    it("returns a valid status string", () => {
      const status = getSyncStatus();
      expect(["idle", "syncing", "offline", "error"]).toContain(status);
    });
  });

  describe("subscribeSyncStatus", () => {
    it("returns an unsubscribe function", () => {
      const unsub = subscribeSyncStatus(() => {});
      expect(typeof unsub).toBe("function");
      unsub();
    });

    it("calls listener immediately with current status", async () => {
      const listener = vi.fn();
      const unsub = subscribeSyncStatus(listener);
      // Wait for the async getPendingCount to resolve
      await new Promise(r => setTimeout(r, 50));
      expect(listener).toHaveBeenCalled();
      unsub();
    });
  });

  describe("processQueue", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });

    it("processes pending operations successfully", async () => {
      const { enqueue } = await import("../lib/offline-queue");
      const { processQueue } = await import("../lib/sync-manager");

      await enqueue("ADD_LIST", { deckId: "d1" });
      await processQueue();

      const { getQueue } = await import("../lib/offline-queue");
      const queue = await getQueue();
      // Operation should be dequeued after successful sync
      expect(queue.length).toBe(0);
    });

    it("sets status to offline when not online", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });

      const { processQueue, getSyncStatus } = await import("../lib/sync-manager");
      await processQueue();

      // Allow status update
      await new Promise(r => setTimeout(r, 50));
      expect(getSyncStatus()).toBe("offline");

      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });
  });
});
