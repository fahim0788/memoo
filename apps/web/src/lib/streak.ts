import { idbGet, idbSet } from "./idb";
import { debugDate } from "./debug-date";

const GLOBAL_STATS_KEY = "global_stats";

type GlobalStats = {
  lastActiveDay: string;
  streak: number;
};

function todayKey() {
  return debugDate().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = debugDate();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function updateStreak(): Promise<void> {
  const today = todayKey();
  const stats = await idbGet<GlobalStats>(GLOBAL_STATS_KEY);

  if (!stats) {
    await idbSet(GLOBAL_STATS_KEY, { lastActiveDay: today, streak: 1 });
    return;
  }

  if (stats.lastActiveDay === today) return;

  const streak = stats.lastActiveDay === yesterdayKey()
    ? stats.streak + 1
    : 1;

  await idbSet(GLOBAL_STATS_KEY, { lastActiveDay: today, streak });
}

export async function getStreak(): Promise<number> {
  const stats = await idbGet<GlobalStats>(GLOBAL_STATS_KEY);
  if (!stats) return 0;

  const today = todayKey();
  const yesterday = yesterdayKey();

  if (stats.lastActiveDay === today || stats.lastActiveDay === yesterday) {
    return stats.streak;
  }
  return 0;
}
