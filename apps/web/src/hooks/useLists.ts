import { useState, useCallback, useEffect } from "react";
import type { DeckFromApi, CardFromApi } from "../lib/api";
import {
  fetchLists,
  fetchMyLists,
  fetchCards,
  addList as apiAddList,
  removeList as apiRemoveList,
} from "../lib/api-cache";

export function useLists() {
  const [myLists, setMyLists] = useState<DeckFromApi[]>([]);
  const [allLists, setAllLists] = useState<DeckFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      setError(null);
      const [my, all] = await Promise.all([fetchMyLists(), fetchLists()]);
      setMyLists(my);
      setAllLists(all);
    } catch (err) {
      console.error("[useLists] Failed to load lists:", err);
      setError(err instanceof Error ? err.message : "Failed to load lists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const addList = useCallback(async (deckId: string) => {
    try {
      setError(null);
      await apiAddList(deckId);
      await loadLists();
    } catch (err) {
      console.error("[useLists] Failed to add list:", err);
      setError(err instanceof Error ? err.message : "Failed to add list");
      throw err;
    }
  }, [loadLists]);

  const removeList = useCallback(async (deckId: string) => {
    try {
      setError(null);
      await apiRemoveList(deckId);
      await loadLists();
    } catch (err) {
      console.error("[useLists] Failed to remove list:", err);
      setError(err instanceof Error ? err.message : "Failed to remove list");
      throw err;
    }
  }, [loadLists]);

  const getCards = useCallback(async (deckId: string): Promise<CardFromApi[]> => {
    try {
      setError(null);
      return await fetchCards(deckId);
    } catch (err) {
      console.error(`[useLists] Failed to get cards for deck ${deckId}:`, err);
      setError(err instanceof Error ? err.message : "Failed to load cards");
      throw err;
    }
  }, []);

  return {
    myLists,
    allLists,
    loading,
    error,
    addList,
    removeList,
    getCards,
    reload: loadLists,
  };
}
