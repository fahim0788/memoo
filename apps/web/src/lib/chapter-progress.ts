/**
 * Track which chapters have been started per deck (localStorage)
 */

const KEY = "chapter-progress";

type ProgressMap = Record<string, string[]>; // deckId → chapterIds[]

function getAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStartedChapters(deckId: string): string[] {
  return getAll()[deckId] || [];
}

export function markChapterStarted(deckId: string, chapterId: string): void {
  const all = getAll();
  const started = all[deckId] || [];
  if (!started.includes(chapterId)) {
    started.push(chapterId);
    all[deckId] = started;
    localStorage.setItem(KEY, JSON.stringify(all));
  }
}

export function markAllChaptersStarted(deckId: string, chapterIds: string[]): void {
  const all = getAll();
  all[deckId] = [...new Set([...(all[deckId] || []), ...chapterIds])];
  localStorage.setItem(KEY, JSON.stringify(all));
}
