import type { CardState } from "./sr-engine";

export type ChapterStatus = "not-started" | "in-progress" | "studied";

export function chapterStatusColor(status: ChapterStatus): string {
  switch (status) {
    case "not-started":  return "var(--color-chapter-empty)";
    case "in-progress":  return "var(--color-chapter-progress)";
    case "studied":      return "var(--color-chapter-studied)";
  }
}

export function computeChapterStatus(
  cardIds: string[],
  studyCards: Record<string, CardState>,
): ChapterStatus {
  if (cardIds.length === 0) return "not-started";

  let reviewed = 0;

  for (const id of cardIds) {
    const cs = studyCards[id];
    if (cs && (cs.successCount > 0 || cs.failureCount > 0)) {
      reviewed++;
    }
  }

  if (reviewed === 0) return "not-started";
  if (reviewed < cardIds.length) return "in-progress";
  return "studied";
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
