/**
 * Track chapter visit count per deck (localStorage)
 *
 * Storage format: { deckId: { chapterId: visitCount, ... }, ... }
 * Migrates from old format (deckId → chapterIds[]) on read.
 */

const KEY = "chapter-progress";

type VisitMap = Record<string, Record<string, number>>; // deckId → { chapterId: count }

function getAll(): VisitMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    // Migrate old format: { deckId: ["ch1", "ch2"] } → { deckId: { ch1: 1, ch2: 1 } }
    const result: VisitMap = {};
    for (const [deckId, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        result[deckId] = {};
        for (const chId of value as string[]) {
          result[deckId][chId] = 1;
        }
      } else {
        result[deckId] = value as Record<string, number>;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveAll(map: VisitMap): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

/** Returns the list of started chapter IDs (visit count >= 1) */
export function getStartedChapters(deckId: string): string[] {
  const deck = getAll()[deckId] || {};
  return Object.keys(deck).filter((id) => deck[id] >= 1);
}

/** Returns visit counts per chapter: { chapterId: count } */
export function getChapterVisits(deckId: string): Record<string, number> {
  return getAll()[deckId] || {};
}

export function markChapterStarted(deckId: string, chapterId: string): void {
  const all = getAll();
  if (!all[deckId]) all[deckId] = {};
  all[deckId][chapterId] = (all[deckId][chapterId] || 0) + 1;
  saveAll(all);
}

export function markAllChaptersStarted(deckId: string, chapterIds: string[]): void {
  const all = getAll();
  if (!all[deckId]) all[deckId] = {};
  for (const id of chapterIds) {
    all[deckId][id] = (all[deckId][id] || 0) + 1;
  }
  saveAll(all);
}
