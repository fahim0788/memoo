import { describe, it, expect } from "vitest";
import {
  getStartedChapters,
  markChapterStarted,
  markAllChaptersStarted,
} from "../lib/chapter-progress";

describe("chapter-progress", () => {
  describe("getStartedChapters", () => {
    it("returns empty array for unknown deck", () => {
      expect(getStartedChapters("deck-unknown")).toEqual([]);
    });

    it("returns started chapters after marking", () => {
      markChapterStarted("deck-1", "ch-1");
      expect(getStartedChapters("deck-1")).toEqual(["ch-1"]);
    });

    it("isolates decks from each other", () => {
      markChapterStarted("deck-a", "ch-1");
      markChapterStarted("deck-b", "ch-2");
      expect(getStartedChapters("deck-a")).toEqual(["ch-1"]);
      expect(getStartedChapters("deck-b")).toEqual(["ch-2"]);
    });
  });

  describe("markChapterStarted", () => {
    it("adds a chapter to the started list", () => {
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c2");
      expect(getStartedChapters("d1")).toEqual(["c1", "c2"]);
    });

    it("does not duplicate already-started chapters", () => {
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c1");
      expect(getStartedChapters("d1")).toEqual(["c1"]);
    });

    it("persists to localStorage", () => {
      markChapterStarted("d1", "c1");
      const raw = localStorage.getItem("chapter-progress");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.d1).toEqual(["c1"]);
    });
  });

  describe("markAllChaptersStarted", () => {
    it("marks multiple chapters at once", () => {
      markAllChaptersStarted("d1", ["c1", "c2", "c3"]);
      expect(getStartedChapters("d1")).toEqual(["c1", "c2", "c3"]);
    });

    it("merges with existing chapters without duplicates", () => {
      markChapterStarted("d1", "c1");
      markAllChaptersStarted("d1", ["c1", "c2", "c3"]);
      const result = getStartedChapters("d1");
      expect(result).toContain("c1");
      expect(result).toContain("c2");
      expect(result).toContain("c3");
      expect(result.length).toBe(3);
    });

    it("handles empty array", () => {
      markChapterStarted("d1", "c1");
      markAllChaptersStarted("d1", []);
      expect(getStartedChapters("d1")).toEqual(["c1"]);
    });
  });

  describe("edge cases", () => {
    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("chapter-progress", "not-json{{{");
      expect(getStartedChapters("d1")).toEqual([]);
    });
  });
});
