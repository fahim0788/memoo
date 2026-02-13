import { useState, useEffect, useCallback } from "react";
import { idbGet } from "../lib/idb";
import type { CardFromApi, ChapterFromApi } from "../lib/api";
import type { CardState } from "../lib/sr-engine";
import { computeAllChapterStatuses, type ChapterStatus } from "../lib/chapter-status";

type StudyState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

type CachedData<T> = {
  data: T;
  timestamp: number;
};

type DeckProgress = {
  statuses: Record<string, ChapterStatus>;
  orderedIds: string[]; // chapter IDs in position order
};

/**
 * Computes 4-color chapter statuses for each deck from IDB data.
 * Returns progressMap[deckId] = { statuses, orderedIds }
 */
export function useChapterProgress(deckIds: string[]) {
  const [progressMap, setProgressMap] = useState<Record<string, DeckProgress>>({});

  const deckKey = deckIds.join(",");

  const compute = useCallback(async () => {
    const result: Record<string, DeckProgress> = {};

    await Promise.all(
      deckIds.map(async (deckId) => {
        try {
          const [cachedCards, cachedChapters, studyState] = await Promise.all([
            idbGet<CachedData<CardFromApi[]>>(`cache:cards:${deckId}`),
            idbGet<CachedData<ChapterFromApi[]>>(`cache:chapters:${deckId}`),
            idbGet<StudyState>(`state:${deckId}`),
          ]);

          if (!cachedCards?.data || cachedCards.data.length === 0) return;

          const studyCards = studyState?.cards || {};
          const statuses = computeAllChapterStatuses(cachedCards.data, studyCards);

          // Use cached chapter order (sorted by position), fallback to statuses keys
          const orderedIds = cachedChapters?.data
            ? cachedChapters.data
                .sort((a, b) => a.position - b.position)
                .map((ch) => ch.id)
            : Object.keys(statuses).filter((id) => id !== "__no_chapter__");

          result[deckId] = { statuses, orderedIds };
        } catch {
          // silently skip deck if IDB read fails
        }
      }),
    );

    setProgressMap(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey]);

  useEffect(() => {
    if (deckIds.length > 0) compute();
  }, [compute, deckIds.length]);

  return { progressMap, refreshProgress: compute };
}
