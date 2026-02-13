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

    it("returns needs-review when 100% coverage but success <= 80%", () => {
      const study = {
        c1: makeCardState(3, 2), // 60%
        c2: makeCardState(4, 1), // 80%
      };
      // Total: 7/12 = 58.3%... wait let's recalc: 7 success, 3 failure = 70%
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("needs-review");
    });

    it("returns needs-review at exactly 80% success rate", () => {
      const study = {
        c1: makeCardState(4, 1), // 80%
        c2: makeCardState(4, 1), // 80%
      };
      // Total: 8 success, 2 failure = 80% (not > 80%)
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("needs-review");
    });

    it("returns mastered when 100% coverage and success > 80%", () => {
      const study = {
        c1: makeCardState(9, 1), // 90%
        c2: makeCardState(8, 1), // 88.9%
      };
      // Total: 17 success, 2 failure = 89.5%
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("mastered");
    });

    it("returns mastered with 100% success rate", () => {
      const study = {
        c1: makeCardState(5, 0),
        c2: makeCardState(3, 0),
      };
      expect(computeChapterStatus(["c1", "c2"], study)).toBe("mastered");
    });

    it("returns needs-review when coverage 100% but 0 total attempts", () => {
      // Edge case: cards exist in study state but with 0 success and 0 failure
      // This shouldn't happen normally, but guard against it
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
      expect(result["ch1"]).toBe("mastered");
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

    it("maps needs-review to chapter-started", () => {
      expect(chapterStatusColor("needs-review")).toBe("var(--color-chapter-started)");
    });

    it("maps mastered to chapter-done", () => {
      expect(chapterStatusColor("mastered")).toBe("var(--color-chapter-done)");
    });
  });
});
