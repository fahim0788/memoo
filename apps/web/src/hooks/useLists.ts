import { useState, useCallback, useEffect } from "react";
import type { DeckFromApi, CardFromApi } from "../lib/api";
import {
  fetchLists,
  fetchMyLists,
  fetchAvailablePersonalDecks,
  fetchCards,
  addList as apiAddList,
  removeList as apiRemoveList,
  reorderLists as apiReorderLists,
  deleteDeck as apiDeleteDeck,
  refreshCache,
} from "../lib/api-cache";

export function useLists() {
  const [myLists, setMyLists] = useState<DeckFromApi[]>([]);
  const [allLists, setAllLists] = useState<DeckFromApi[]>([]);
  const [availablePersonalLists, setAvailablePersonalLists] = useState<DeckFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      setError(null);
      const [my, all, availablePersonal] = await Promise.all([
        fetchMyLists(),
        fetchLists(),
        fetchAvailablePersonalDecks(),
      ]);
      console.log("[useLists] Loaded lists:", { my: my.length, all: all.length, availablePersonal: availablePersonal.length });
      // Force new array references to ensure React detects changes
      setMyLists([...my]);
      setAllLists([...all]);
      setAvailablePersonalLists([...availablePersonal]);
    } catch (err) {
      console.error("[useLists] Failed to load lists:", err);
      setError(err instanceof Error ? err.message : "Impossible de charger les listes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const addList = useCallback(async (deckId: string, icon?: string) => {
    try {
      setError(null);
      // Optimistic update happens in api-cache, operation is queued
      await apiAddList(deckId, icon);
      // Reload from cache to get updated state
      await loadLists();
    } catch (err) {
      // This shouldn't throw in normal operation since errors are queued
      console.error("[useLists] Unexpected error in addList:", err);
      setError(err instanceof Error ? err.message : "Impossible d'ajouter la liste");
    }
  }, [loadLists]);

  const removeList = useCallback(async (deckId: string) => {
    try {
      setError(null);
      // Always unsubscribe (never delete) - deletion is handled separately
      await apiRemoveList(deckId);
      // Reload from cache to get updated state
      await loadLists();
    } catch (err) {
      console.error("[useLists] Unexpected error in removeList:", err);
      setError(err instanceof Error ? err.message : "Impossible de retirer la liste");
    }
  }, [loadLists]);

  const reorderLists = useCallback(async (deckIds: string[]) => {
    try {
      setError(null);
      await apiReorderLists(deckIds);
      // Reload from cache to get updated state
      await loadLists();
    } catch (err) {
      console.error("[useLists] Unexpected error in reorderLists:", err);
      setError(err instanceof Error ? err.message : "Impossible de réorganiser les listes");
    }
  }, [loadLists]);

  const deleteDeck = useCallback(async (deckId: string) => {
    try {
      setError(null);
      await apiDeleteDeck(deckId);
      // Reload from cache to get updated state
      await loadLists();
    } catch (err) {
      console.error("[useLists] Unexpected error in deleteDeck:", err);
      setError(err instanceof Error ? err.message : "Impossible de supprimer la liste");
    }
  }, [loadLists]);

  const getCards = useCallback(async (deckId: string): Promise<CardFromApi[]> => {
    try {
      setError(null);
      return await fetchCards(deckId);
    } catch (err) {
      console.error(`[useLists] Failed to get cards for deck ${deckId}:`, err);
      setError(err instanceof Error ? err.message : "Impossible de charger les cartes");
      throw err;
    }
  }, []);

  // Force refresh from API (bypasses cache TTL)
  const forceRefresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await refreshCache();
      await loadLists();
    } catch (err) {
      console.error("[useLists] Failed to force refresh:", err);
      setError(err instanceof Error ? err.message : "Impossible de rafraîchir les données");
    } finally {
      setLoading(false);
    }
  }, [loadLists]);

  return {
    myLists,
    allLists,
    availablePersonalLists,
    loading,
    error,
    addList,
    removeList,
    reorderLists,
    deleteDeck,
    getCards,
    reload: loadLists,
    forceRefresh,
  };
}
