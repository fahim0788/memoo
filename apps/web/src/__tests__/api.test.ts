import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractEmoji } from "../lib/api";

// Mock auth module
vi.mock("../lib/auth", () => ({
  getToken: vi.fn(() => "fake-token"),
}));

describe("api", () => {
  describe("extractEmoji", () => {
    it("extracts simple emoji at the start followed by space", () => {
      const result = extractEmoji("⭐ Stars");
      expect(result.emoji).toBe("⭐");
      expect(result.name).toBe("Stars");
    });

    it("returns empty emoji when no emoji present", () => {
      const result = extractEmoji("France");
      expect(result.emoji).toBe("");
      expect(result.name).toBe("France");
    });

    it("returns empty emoji for empty string", () => {
      const result = extractEmoji("");
      expect(result.emoji).toBe("");
      expect(result.name).toBe("");
    });

    it("handles emoji without trailing text", () => {
      // No space after emoji means no match
      const result = extractEmoji("🎵");
      expect(result.emoji).toBe("");
      expect(result.name).toBe("🎵");
    });

    it("extracts only the first emoji", () => {
      const result = extractEmoji("🎵 Music 🎶");
      expect(result.emoji).toBe("🎵");
      expect(result.name).toBe("Music 🎶");
    });

    it("trims whitespace from name", () => {
      const result = extractEmoji("⭐  Stars  ");
      expect(result.name).toBe("Stars");
    });
  });

  describe("STORAGE_BASE", () => {
    it("is exported", async () => {
      const mod = await import("../lib/api");
      expect(mod.STORAGE_BASE).toBeDefined();
    });
  });

  describe("safeFetch error handling", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("throws user-friendly error on 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "unauthorized" }),
      }));

      const { fetchLists } = await import("../lib/api");
      await expect(fetchLists()).rejects.toThrow("Session expirée");
    });

    it("throws user-friendly error on 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      }));

      const { fetchLists } = await import("../lib/api");
      await expect(fetchLists()).rejects.toThrow("introuvable");
    });

    it("throws user-friendly error on 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }));

      const { fetchLists } = await import("../lib/api");
      await expect(fetchLists()).rejects.toThrow("Erreur serveur");
    });

    it("throws network error when fetch throws TypeError", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      // navigator.onLine is true by default in jsdom

      const { fetchLists } = await import("../lib/api");
      await expect(fetchLists()).rejects.toThrow("Connexion au serveur impossible");
    });

    it("throws offline message when navigator.onLine is false", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });

      const { fetchLists } = await import("../lib/api");
      await expect(fetchLists()).rejects.toThrow("hors ligne");

      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });
  });

  describe("API functions call correct endpoints", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ decks: [], cards: [], chapters: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);
    });

    it("fetchLists calls /api/lists", async () => {
      const { fetchLists } = await import("../lib/api");
      await fetchLists();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/lists"),
        expect.any(Object)
      );
    });

    it("fetchMyLists calls /api/my-lists", async () => {
      const { fetchMyLists } = await import("../lib/api");
      await fetchMyLists();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/my-lists"),
        expect.any(Object)
      );
    });

    it("addList sends POST with deckId", async () => {
      const { addList } = await import("../lib/api");
      await addList("deck-123", "star:#000");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/my-lists"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("deck-123"),
        })
      );
    });

    it("removeList sends DELETE", async () => {
      const { removeList } = await import("../lib/api");
      await removeList("deck-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/my-lists/deck-123"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("reorderLists sends PUT with deckIds", async () => {
      const { reorderLists } = await import("../lib/api");
      await reorderLists(["a", "b", "c"]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/my-lists/reorder"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"a"'),
        })
      );
    });

    it("deleteDeck sends DELETE to my-decks", async () => {
      const { deleteDeck } = await import("../lib/api");
      await deleteDeck("deck-456");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/my-decks/deck-456"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("fetchCards calls correct endpoint", async () => {
      const { fetchCards } = await import("../lib/api");
      await fetchCards("deck-789");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/lists/deck-789/cards"),
        expect.any(Object)
      );
    });

    it("pushReviews sends POST with reviews array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, created: 1, serverTime: Date.now() }),
      });
      const { pushReviews } = await import("../lib/api");
      await pushReviews([{ cardId: "c1", ok: true, userAnswer: "Paris" }]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync/push"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("c1"),
        })
      );
    });

    it("includes Authorization header with Bearer token", async () => {
      const { fetchLists } = await import("../lib/api");
      await fetchLists();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer fake-token",
          }),
        })
      );
    });
  });
});
