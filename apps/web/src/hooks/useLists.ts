import { useState, useCallback, useEffect } from "react";
import type { DeckFromApi, CardFromApi } from "../lib/api";
import {
  fetchLists,
  fetchMyLists,
  fetchAvailablePersonalDecks,
  fetchCards,
  addList as apiAddList,
  removeList as apiRemoveList,
  deleteDeck as apiDeleteDeck,
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
      setMyLists(my);
      setAllLists(all);
      setAvailablePersonalLists(availablePersonal);
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
      // Check if this deck is owned by the user
      const deck = myLists.find(d => d.id === deckId);
      if (deck?.isOwned) {
        // Delete the deck entirely (user owns it)
        await apiDeleteDeck(deckId);
      } else {
        // Just unsubscribe from the deck
        await apiRemoveList(deckId);
      }
      await loadLists();
    } catch (err) {
      console.error("[useLists] Failed to remove list:", err);
      setError(err instanceof Error ? err.message : "Failed to remove list");
      throw err;
    }
  }, [loadLists, myLists]);

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
    availablePersonalLists,
    loading,
    error,
    addList,
    removeList,
    getCards,
    reload: loadLists,
  };
}
