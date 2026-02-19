/**
 * API cache layer - wraps API calls with IndexedDB caching
 * Provides true offline-first data access with operation queue
 */

import { idbGet, idbSet } from "./idb";
import {
  fetchLists as apiFetchLists,
  fetchMyLists as apiFetchMyLists,
  fetchAvailablePersonalDecks as apiFetchAvailablePersonalDecks,
  fetchCards as apiFetchCards,
  reorderLists as apiReorderLists,
  type DeckFromApi,
  type CardFromApi,
} from "./api";
import { enqueue } from "./offline-queue";
import { processQueue, isOnline } from "./sync-manager";

const CACHE_KEYS = {
  ALL_LISTS: "cache:all-lists",
  MY_LISTS: "cache:my-lists",
  AVAILABLE_PERSONAL: "cache:available-personal",
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
 * Strategy: Cache-first with stale fallback
 */
export async function fetchLists(): Promise<DeckFromApi[]> {
  const cached = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.ALL_LISTS);

  // If online and cache expired, try to fetch fresh data
  if (isOnline() && !isCacheValid(cached)) {
    try {
      const data = await apiFetchLists();
      await idbSet(CACHE_KEYS.ALL_LISTS, { data, timestamp: Date.now() });
      console.log("[Cache] Updated all lists cache from API");
      return data;
    } catch (err) {
      console.warn("[Cache] Failed to fetch lists from API, using cache", err);
    }
  }

  // Return cached data (fresh or stale)
  if (cached) {
    console.log("[Cache] Using cached all lists", isCacheValid(cached) ? "(fresh)" : "(stale)");
    return cached.data;
  }

  // No cache at all - throw error
  throw new Error("No cached data and unable to fetch from API");
}

/**
 * Fetch user's subscribed lists (with cache)
 * Strategy: Cache-first with stale fallback
 */
export async function fetchMyLists(): Promise<DeckFromApi[]> {
  const cached = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS);

  if (isOnline() && !isCacheValid(cached)) {
    try {
      const data = await apiFetchMyLists();
      await idbSet(CACHE_KEYS.MY_LISTS, { data, timestamp: Date.now() });
      console.log("[Cache] Updated my lists cache from API");
      return data;
    } catch (err) {
      console.warn("[Cache] Failed to fetch my lists from API, using cache", err);
    }
  }

  if (cached) {
    console.log("[Cache] Using cached my lists", isCacheValid(cached) ? "(fresh)" : "(stale)");
    return cached.data;
  }

  throw new Error("No cached data and unable to fetch from API");
}

/**
 * Fetch user's personal decks that are not yet activated (with cache)
 * Strategy: Cache-first with stale fallback
 */
export async function fetchAvailablePersonalDecks(): Promise<DeckFromApi[]> {
  const cached = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.AVAILABLE_PERSONAL);

  if (isOnline() && !isCacheValid(cached)) {
    try {
      const data = await apiFetchAvailablePersonalDecks();
      await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data, timestamp: Date.now() });
      console.log("[Cache] Updated available personal decks cache from API");
      return data;
    } catch (err) {
      console.warn("[Cache] Failed to fetch available personal decks from API, using cache", err);
    }
  }

  if (cached) {
    console.log("[Cache] Using cached available personal decks", isCacheValid(cached) ? "(fresh)" : "(stale)");
    return cached.data;
  }

  throw new Error("No cached data and unable to fetch from API");
}

/**
 * Fetch cards for a deck (with cache)
 * Strategy: Cache-first with stale fallback
 */
export async function fetchCards(deckId: string): Promise<CardFromApi[]> {
  const cacheKey = CACHE_KEYS.CARDS(deckId);
  const cached = await idbGet<CachedData<CardFromApi[]>>(cacheKey);

  if (isOnline() && !isCacheValid(cached)) {
    try {
      const data = await apiFetchCards(deckId);
      await idbSet(cacheKey, { data, timestamp: Date.now() });
      console.log(`[Cache] Updated cards cache for deck ${deckId} from API`);
      return data;
    } catch (err) {
      console.warn(`[Cache] Failed to fetch cards for deck ${deckId} from API, using cache`, err);
    }
  }

  if (cached) {
    console.log(`[Cache] Using cached cards for deck ${deckId}`, isCacheValid(cached) ? "(fresh)" : "(stale)");
    return cached.data;
  }

  throw new Error("No cached data and unable to fetch from API");
}

/**
 * Restore cache from a snapshot (used for rollback on partial write failure)
 */
async function restoreSnapshot(snapshot: {
  myLists?: unknown[];
  allLists?: unknown[];
  availablePersonal?: unknown[];
}): Promise<void> {
  if (snapshot.myLists !== undefined) {
    await idbSet(CACHE_KEYS.MY_LISTS, { data: snapshot.myLists, timestamp: Date.now() });
  }
  if (snapshot.allLists !== undefined) {
    await idbSet(CACHE_KEYS.ALL_LISTS, { data: snapshot.allLists, timestamp: Date.now() });
  }
  if (snapshot.availablePersonal !== undefined) {
    await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: snapshot.availablePersonal, timestamp: Date.now() });
  }
}

/**
 * Add a list to user's subscriptions
 * TRUE OFFLINE-FIRST: Updates cache immediately, queues API call
 */
export async function addList(deckId: string, icon?: string): Promise<void> {
  // 1. Read current caches for snapshot (rollback data)
  const [myListsCache, allListsCache, availableCache] = await Promise.all([
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS),
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.ALL_LISTS),
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.AVAILABLE_PERSONAL),
  ]);

  // 2. Create snapshot for potential rollback
  const snapshot = {
    myLists: myListsCache?.data,
    allLists: allListsCache?.data,
    availablePersonal: availableCache?.data,
  };

  // 3. Find the deck to add
  const deckFromAll = allListsCache?.data?.find(d => d.id === deckId);
  const deckFromPersonal = availableCache?.data?.find(d => d.id === deckId);
  const deckToAdd = deckFromAll || deckFromPersonal;

  // 4+5. Optimistic update + enqueue (atomic block with rollback)
  try {
    if (deckToAdd) {
      const newMyLists = [...(myListsCache?.data || []), { ...deckToAdd, icon: icon || null }];
      await idbSet(CACHE_KEYS.MY_LISTS, { data: newMyLists, timestamp: Date.now() });
    }
    if (allListsCache?.data) {
      const newAllLists = allListsCache.data.filter(d => d.id !== deckId);
      await idbSet(CACHE_KEYS.ALL_LISTS, { data: newAllLists, timestamp: Date.now() });
    }
    if (availableCache?.data) {
      const newAvailable = availableCache.data.filter(d => d.id !== deckId);
      await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: newAvailable, timestamp: Date.now() });
    }

    console.log("[Cache] Optimistic update done for addList");

    await enqueue("ADD_LIST", { deckId, icon, snapshot });
  } catch (err) {
    console.error("[Cache] Failed during addList, rolling back", err);
    await restoreSnapshot(snapshot);
    throw err;
  }

  // 6. Try to process queue immediately if online
  processQueue();
}

/**
 * Remove a list from user's subscriptions
 * TRUE OFFLINE-FIRST: Updates cache immediately, queues API call
 */
export async function removeList(deckId: string): Promise<void> {
  // 1. Read current caches for snapshot
  const [myListsCache, allListsCache, availableCache] = await Promise.all([
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS),
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.ALL_LISTS),
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.AVAILABLE_PERSONAL),
  ]);

  // 2. Create snapshot for potential rollback
  const snapshot = {
    myLists: myListsCache?.data,
    allLists: allListsCache?.data,
    availablePersonal: availableCache?.data,
  };

  // 3. Find the deck being removed
  const deckToRemove = myListsCache?.data?.find(d => d.id === deckId);

  // 4+5. Optimistic update + enqueue (atomic block with rollback)
  try {
    if (myListsCache?.data) {
      const newMyLists = myListsCache.data.filter(d => d.id !== deckId);
      await idbSet(CACHE_KEYS.MY_LISTS, { data: newMyLists, timestamp: Date.now() });
    }
    if (deckToRemove) {
      if (deckToRemove.isOwned) {
        const newAvailable = [...(availableCache?.data || []), deckToRemove];
        await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: newAvailable, timestamp: Date.now() });
      } else {
        const newAllLists = [...(allListsCache?.data || []), deckToRemove];
        await idbSet(CACHE_KEYS.ALL_LISTS, { data: newAllLists, timestamp: Date.now() });
      }
    }

    console.log("[Cache] Optimistic update done for removeList");

    await enqueue("REMOVE_LIST", { deckId, snapshot });
  } catch (err) {
    console.error("[Cache] Failed during removeList, rolling back", err);
    await restoreSnapshot(snapshot);
    throw err;
  }

  // 6. Try to process queue immediately if online
  processQueue();
}

/**
 * Reorder user's lists
 * TRUE OFFLINE-FIRST: Updates cache immediately, queues API call
 */
export async function reorderLists(deckIds: string[]): Promise<void> {
  // 1. Read current cache for snapshot
  const myListsCache = await idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS);

  // 2. Create snapshot for potential rollback
  const snapshot = {
    myLists: myListsCache?.data,
  };

  // 3+4. Optimistic update + enqueue (atomic block with rollback)
  try {
    if (myListsCache?.data) {
      const reordered = deckIds
        .map(id => myListsCache.data.find(d => d.id === id))
        .filter((d): d is DeckFromApi => d !== undefined);
      await idbSet(CACHE_KEYS.MY_LISTS, { data: reordered, timestamp: Date.now() });
    }

    console.log("[Cache] Optimistic update done for reorderLists");

    await enqueue("REORDER_LISTS", { deckIds, snapshot });
  } catch (err) {
    console.error("[Cache] Failed during reorderLists, rolling back", err);
    await restoreSnapshot(snapshot);
    throw err;
  }

  // 5. Try to process queue immediately if online
  processQueue();
}

/**
 * Delete a user-owned deck
 * TRUE OFFLINE-FIRST: Updates cache immediately, queues API call
 */
export async function deleteDeck(deckId: string): Promise<void> {
  // 1. Read current caches for snapshot
  const [myListsCache, availableCache] = await Promise.all([
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.MY_LISTS),
    idbGet<CachedData<DeckFromApi[]>>(CACHE_KEYS.AVAILABLE_PERSONAL),
  ]);

  // 2. Create snapshot for potential rollback
  const snapshot = {
    myLists: myListsCache?.data,
    availablePersonal: availableCache?.data,
  };

  // 3+4. Optimistic update + enqueue (atomic block with rollback)
  try {
    if (myListsCache?.data) {
      const newMyLists = myListsCache.data.filter(d => d.id !== deckId);
      await idbSet(CACHE_KEYS.MY_LISTS, { data: newMyLists, timestamp: Date.now() });
    }
    if (availableCache?.data) {
      const newAvailable = availableCache.data.filter(d => d.id !== deckId);
      await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: newAvailable, timestamp: Date.now() });
    }
    await idbSet(CACHE_KEYS.CARDS(deckId), null);

    console.log("[Cache] Optimistic update done for deleteDeck");

    await enqueue("DELETE_DECK", { deckId, snapshot });
  } catch (err) {
    console.error("[Cache] Failed during deleteDeck, rolling back", err);
    await restoreSnapshot(snapshot);
    throw err;
  }

  // 5. Try to process queue immediately if online
  processQueue();
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  const keys = [
    CACHE_KEYS.ALL_LISTS,
    CACHE_KEYS.MY_LISTS,
    CACHE_KEYS.AVAILABLE_PERSONAL,
    CACHE_KEYS.LAST_SYNC,
  ];
  await Promise.all(keys.map(key => idbSet(key, null)));
  console.log("[Cache] Cleared all cache");
}

/**
 * Force refresh cache from API (requires network)
 */
export async function refreshCache(): Promise<void> {
  if (!isOnline()) {
    console.warn("[Cache] Cannot refresh cache while offline");
    return;
  }

  try {
    const [allLists, myLists, availablePersonal] = await Promise.all([
      apiFetchLists(),
      apiFetchMyLists(),
      apiFetchAvailablePersonalDecks(),
    ]);

    await Promise.all([
      idbSet(CACHE_KEYS.ALL_LISTS, { data: allLists, timestamp: Date.now() }),
      idbSet(CACHE_KEYS.MY_LISTS, { data: myLists, timestamp: Date.now() }),
      idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: availablePersonal, timestamp: Date.now() }),
    ]);

    console.log("[Cache] Force refreshed cache from API");
  } catch (err) {
    console.warn("[Cache] Failed to refresh cache", err);
  }
}
