import { describe, it, expect } from "vitest";
import {
  getStartedChapters,
  getChapterVisits,
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

  describe("getChapterVisits", () => {
    it("returns empty object for unknown deck", () => {
      expect(getChapterVisits("deck-unknown")).toEqual({});
    });

    it("returns visit counts per chapter", () => {
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c2");
      const visits = getChapterVisits("d1");
      expect(visits["c1"]).toBe(2);
      expect(visits["c2"]).toBe(1);
    });
  });

  describe("markChapterStarted", () => {
    it("adds a chapter to the started list", () => {
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c2");
      expect(getStartedChapters("d1")).toEqual(["c1", "c2"]);
    });

    it("increments visit count on repeated calls", () => {
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c1");
      markChapterStarted("d1", "c1");
      expect(getChapterVisits("d1")["c1"]).toBe(3);
    });

    it("persists to localStorage", () => {
      markChapterStarted("d1", "c1");
      const raw = localStorage.getItem("chapter-progress");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.d1.c1).toBe(1);
    });
  });

  describe("markAllChaptersStarted", () => {
    it("marks multiple chapters at once", () => {
      markAllChaptersStarted("d1", ["c1", "c2", "c3"]);
      expect(getStartedChapters("d1")).toEqual(["c1", "c2", "c3"]);
    });

    it("increments existing chapters", () => {
      markChapterStarted("d1", "c1");
      markAllChaptersStarted("d1", ["c1", "c2", "c3"]);
      const visits = getChapterVisits("d1");
      expect(visits["c1"]).toBe(2);
      expect(visits["c2"]).toBe(1);
      expect(visits["c3"]).toBe(1);
    });

    it("handles empty array", () => {
      markChapterStarted("d1", "c1");
      markAllChaptersStarted("d1", []);
      expect(getStartedChapters("d1")).toEqual(["c1"]);
    });
  });

  describe("migration", () => {
    it("migrates old array format to visit counts", () => {
      localStorage.setItem("chapter-progress", JSON.stringify({
        "d1": ["ch-a", "ch-b"],
      }));
      expect(getStartedChapters("d1")).toEqual(["ch-a", "ch-b"]);
      expect(getChapterVisits("d1")).toEqual({ "ch-a": 1, "ch-b": 1 });
    });
  });

  describe("edge cases", () => {
    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("chapter-progress", "not-json{{{");
      expect(getStartedChapters("d1")).toEqual([]);
      expect(getChapterVisits("d1")).toEqual({});
    });
  });
});
