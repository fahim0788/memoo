import { describe, it, expect } from "vitest";
import {
  computeChapterStatus,
  computeAllChapterStatuses,
  chapterStatusColor,
} from "../lib/chapter-status";
import type { CardState } from "../lib/sr-engine";

function makeCardState(success: number, failure: number): CardState {
  return {
    reps: success,
    intervalDays: 1,
    ease: 2.0,
    nextReviewAt: Date.now(),
    lastReviewedAt: Date.now(),
    successCount: success,
    failureCount: failure,
  };
}

describe("chapter-status", () => {
  describe("computeChapterStatus", () => {
    it("returns not-started for empty cardIds", () => {
      expect(computeChapterStatus([], {})).toBe("not-started");
    });

    it("returns not-started when no cards have been studied", () => {
      expect(computeChapterStatus(["c1", "c2"], {})).toBe("not-started");
    });

    it("returns not-started when cards exist but have 0 reviews", () => {
      const study = { c1: makeCardState(0, 0) };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("not-started");
    });

    it("returns in-progress when some cards studied but not all", () => {
      const study = { c1: makeCardState(5, 1) };
      expect(computeChapterStatus(["c1", "c2", "c3"], study)).toBe("in-progress");
    });

    it("returns studied when all cards have been reviewed", () => {
      const study = {
        c1: makeCardState(3, 2),
        c2: makeCardState(4, 1),
      };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("studied");
    });

    it("returns studied regardless of success rate", () => {
      const study = {
        c1: makeCardState(1, 5), // low success
        c2: makeCardState(1, 5),
      };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("studied");
    });

    it("returns studied with 100% success rate", () => {
      const study = {
        c1: makeCardState(5, 0),
        c2: makeCardState(3, 0),
      };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("studied");
    });

    it("returns not-started when coverage 100% but 0 total attempts", () => {
      const study = {
        c1: makeCardState(0, 0),
        c2: makeCardState(0, 0),
      };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("not-started");
    });
  });

  describe("computeAllChapterStatuses", () => {
    it("groups cards by chapterId and computes status", () => {
      const cards = [
        { id: "c1", chapterId: "ch1" },
        { id: "c2", chapterId: "ch1" },
        { id: "c3", chapterId: "ch2" },
      ];
      const study = {
        c1: makeCardState(9, 1),
        c2: makeCardState(8, 1),
        // c3 not studied
      };
      const result = computeAllChapterStatuses(cards, study);
      expect(result["ch1"]).toBe("studied");
      expect(result["ch2"]).toBe("not-started");
    });

    it("groups cards without chapterId under __no_chapter__", () => {
      const cards = [
        { id: "c1", chapterId: null },
        { id: "c2" },
      ];
      const study = { c1: makeCardState(5, 0) };
      const result = computeAllChapterStatuses(cards, study);
      expect(result["__no_chapter__"]).toBe("in-progress");
    });

    it("returns empty object for empty cards array", () => {
      expect(computeAllChapterStatuses([], {})).toEqual({});
    });
  });

  describe("chapterStatusColor", () => {
    it("maps not-started to chapter-empty", () => {
      expect(chapterStatusColor("not-started")).toBe("var(--color-chapter-empty)");
    });

    it("maps in-progress to chapter-progress", () => {
      expect(chapterStatusColor("in-progress")).toBe("var(--color-chapter-progress)");
    });

    it("maps studied to chapter-studied", () => {
      expect(chapterStatusColor("studied")).toBe("var(--color-chapter-studied)");
    });
  });
});
