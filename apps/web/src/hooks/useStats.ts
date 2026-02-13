import { useState, useEffect, useCallback } from "react";
import type { DeckFromApi } from "../lib/api";
import type { CardState } from "../lib/sr-engine";
import { idbGet } from "../lib/idb";
import { getStreak } from "../lib/streak";
import { debugNow, debugDate } from "../lib/debug-date";

type StudyState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

export type DeckStats = {
  deckId: string;
  deckName: string;
  successRate: number;
  reviewedToday: number;
  totalReviews: number;
};

export type UpcomingBucket = {
  label: string;
  count: number;
};

export type Stats = {
  todayTotal: number;
  streak: number;
  perDeck: DeckStats[];
  upcoming: UpcomingBucket[];
};

function todayKey() {
  return debugDate().toISOString().slice(0, 10);
}

function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

export function useStats(decks: DeckFromApi[]) {
  const [stats, setStats] = useState<Stats | null>(null);

  const compute = useCallback(async () => {
    const now = debugNow();
    const today = todayKey();
    let todayTotal = 0;
    const perDeck: DeckStats[] = [];
    const allNextReviews: number[] = [];

    for (const deck of decks) {
      const state = await idbGet<StudyState>(`state:${deck.id}`);
      if (!state) continue;

      const reviewedToday = state.lastActiveDay === today ? state.doneToday : 0;
      todayTotal += reviewedToday;

      let totalSuccess = 0;
      let totalFailure = 0;

      for (const cardState of Object.values(state.cards)) {
        const sc = cardState.successCount || 0;
        const fc = cardState.failureCount || 0;
        totalSuccess += sc;
        totalFailure += fc;
        if (Number.isFinite(cardState.nextReviewAt)) {
          allNextReviews.push(cardState.nextReviewAt);
        }
      }

      const totalReviews = totalSuccess + totalFailure;
      perDeck.push({
        deckId: deck.id,
        deckName: deck.name,
        successRate: totalReviews > 0 ? Math.round((totalSuccess / totalReviews) * 100) : 0,
        reviewedToday,
        totalReviews,
      });
    }

    // Group upcoming reviews into buckets
    const buckets = [
      { label: "Aujourd'hui", min: -Infinity, max: 0 },
      { label: "Demain", min: 1, max: 1 },
      { label: "2-3 jours", min: 2, max: 3 },
      { label: "4-7 jours", min: 4, max: 7 },
      { label: "Plus tard", min: 8, max: Infinity },
    ];

    const upcoming: UpcomingBucket[] = buckets.map(b => ({ label: b.label, count: 0 }));

    for (const nextAt of allNextReviews) {
      const days = daysBetween(now, nextAt);
      for (let i = 0; i < buckets.length; i++) {
        if (days <= buckets[i].max) {
          upcoming[i].count++;
          break;
        }
      }
    }

    const streak = await getStreak();

    setStats({
      todayTotal,
      streak,
      perDeck: perDeck.filter(d => d.totalReviews > 0),
      upcoming,
    });
  }, [decks]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { stats, refreshStats: compute };
}
