import type { CardState } from "./sr-engine";

export type ChapterStatus = "not-started" | "in-progress" | "needs-review" | "mastered";

export function chapterStatusColor(status: ChapterStatus): string {
  switch (status) {
    case "not-started":  return "var(--color-chapter-empty)";
    case "in-progress":  return "var(--color-chapter-progress)";
    case "needs-review": return "var(--color-chapter-started)";
    case "mastered":     return "var(--color-chapter-done)";
  }
}

export function computeChapterStatus(
  cardIds: string[],
  studyCards: Record<string, CardState>,
): ChapterStatus {
  if (cardIds.length === 0) return "not-started";

  let reviewed = 0;
  let totalSuccess = 0;
  let totalFailure = 0;

  for (const id of cardIds) {
    const cs = studyCards[id];
    if (cs && (cs.successCount > 0 || cs.failureCount > 0)) {
      reviewed++;
      totalSuccess += cs.successCount;
      totalFailure += cs.failureCount;
    }
  }

  if (reviewed === 0) return "not-started";
  if (reviewed < cardIds.length) return "in-progress";

  const total = totalSuccess + totalFailure;
  const successRate = total > 0 ? totalSuccess / total : 0;
  return successRate > 0.8 ? "mastered" : "needs-review";
}

export function computeAllChapterStatuses(
  cards: Array<{ id: string; chapterId?: string | null }>,
  studyCards: Record<string, CardState>,
): Record<string, ChapterStatus> {
  const groups: Record<string, string[]> = {};
  for (const card of cards) {
    const chId = card.chapterId || "__no_chapter__";
    if (!groups[chId]) groups[chId] = [];
    groups[chId].push(card.id);
  }

  const result: Record<string, ChapterStatus> = {};
  for (const [chId, cardIds] of Object.entries(groups)) {
    result[chId] = computeChapterStatus(cardIds, studyCards);
  }
  return result;
}
