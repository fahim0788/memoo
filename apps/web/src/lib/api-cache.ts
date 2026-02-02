/**
 * API cache layer - wraps API calls with IndexedDB caching
 * Provides offline-first data access for lists and cards
 */

import { idbGet, idbSet } from "./idb";
import {
  fetchLists as apiFetchLists,
  fetchMyLists as apiFetchMyLists,
  fetchCards as apiFetchCards,
  addList as apiAddList,
  removeList as apiRemoveList,
  type DeckFromApi,
  type CardFromApi,
} from "./api";

const CACHE_KEYS = {
  ALL_LISTS: "cache:all-lists",
  MY_LISTS: "cache:my-lists",
  CARDS: (deckId: string) => `cache:cards:${deckId}`,
  LAST_SYNC: "cache:last-sync",
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type CachedData<T> = {
  data: T;
  timestamp: number;
};

/**
 * Check if cached data is still valid
 */
function isCacheValid<T>(cached: CachedData<T> | null): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
}

/**
 * Fetch all available lists (with cache)
 */
export async function fetchLists(): Promise<DeckFromApi[]> {
  const cached = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.ALL_LISTS);

  if (isCacheValid(cached)) {
    console.log("[Cache] Using cached all lists");
    return cached!.data;
  }

  try {
    const data = await apiFetchLists();
    await idbSet(CACHE_KEYS.ALL_LISTS, { data, timestamp: Date.now() });
    console.log("[Cache] Updated all lists cache");
    return data;
  } catch (err) {
    console.warn("[Cache] Failed to fetch lists, using stale cache", err);
    if (cached) return cached.data;
    throw err;
  }
}

/**
 * Fetch user's subscribed lists (with cache)
 */
export async function fetchMyLists(): Promise<DeckFromApi[]> {
  const cached = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS);

  if (isCacheValid(cached)) {
    console.log("[Cache] Using cached my lists");
    return cached!.data;
  }

  try {
    const data = await apiFetchMyLists();
    await idbSet(CACHE_KEYS.MY_LISTS, { data, timestamp: Date.now() });
    console.log("[Cache] Updated my lists cache");
    return data;
  } catch (err) {
    console.warn("[Cache] Failed to fetch my lists, using stale cache", err);
    if (cached) return cached.data;
    throw err;
  }
}

/**
 * Fetch cards for a deck (with cache)
 */
export async function fetchCards(deckId: string): Promise<CardFromApi[]> {
  const cacheKey = CACHE_KEYS.CARDS(deckId);
  const cached = await idbGet<CachedData<CardFromApi[]>>(cacheKey);

  if (isCacheValid(cached)) {
    console.log(`[Cache] Using cached cards for deck ${deckId}`);
    return cached!.data;
  }

  try {
    const data = await apiFetchCards(deckId);
    await idbSet(cacheKey, { data, timestamp: Date.now() });
    console.log(`[Cache] Updated cards cache for deck ${deckId}`);
    return data;
  } catch (err) {
    console.warn(`[Cache] Failed to fetch cards for deck ${deckId}, using stale cache`, err);
    if (cached) return cached.data;
    throw err;
  }
}

/**
 * Add a list to user's subscriptions (invalidates cache)
 */
export async function addList(deckId: string): Promise<void> {
  await apiAddList(deckId);
  // Invalidate caches
  await Promise.all([
    idbSet(CACHE_KEYS.MY_LISTS, null),
    idbSet(CACHE_KEYS.ALL_LISTS, null),
  ]);
  console.log("[Cache] Invalidated lists cache after add");
}

/**
 * Remove a list from user's subscriptions (invalidates cache)
 */
export async function removeList(deckId: string): Promise<void> {
  await apiRemoveList(deckId);
  // Invalidate caches
  await Promise.all([
    idbSet(CACHE_KEYS.MY_LISTS, null),
    idbSet(CACHE_KEYS.ALL_LISTS, null),
  ]);
  console.log("[Cache] Invalidated lists cache after remove");
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  const keys = [
    CACHE_KEYS.ALL_LISTS,
    CACHE_KEYS.MY_LISTS,
    CACHE_KEYS.LAST_SYNC,
  ];
  await Promise.all(keys.map(key => idbSet(key, null)));
  console.log("[Cache] Cleared all cache");
}

/**
 * Force refresh cache (fetch from API even if cache is valid)
 */
export async function refreshCache(): Promise<void> {
  try {
    const [allLists, myLists] = await Promise.all([
      apiFetchLists(),
      apiFetchMyLists(),
    ]);

    await Promise.all([
      idbSet(CACHE_KEYS.ALL_LISTS, { data: allLists, timestamp: Date.now() }),
      idbSet(CACHE_KEYS.MY_LISTS, { data: myLists, timestamp: Date.now() }),
    ]);

    console.log("[Cache] Force refreshed cache");
  } catch (err) {
    console.warn("[Cache] Failed to refresh cache", err);
  }
}
