"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useLists } from "../hooks/useLists";
import { MenuView } from "../components/MenuView";
import { AvailableView } from "../components/AvailableView";
import { StudyView } from "../components/StudyView";
import { CreateDeckView } from "../components/CreateDeckView";
import { SyncStatus } from "../components/SyncStatus";
import type { DeckFromApi, CardFromApi } from "../lib/api";

type View = "menu" | "available" | "studying" | "create";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { myLists, allLists, availablePersonalLists, loading, error, addList, removeList, getCards, reload, forceRefresh } = useLists();

  const [view, setView] = useState<View>("menu");
  const [studyDeck, setStudyDeck] = useState<DeckFromApi | null>(null);
  const [studyCards, setStudyCards] = useState<CardFromApi[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  // Show loading state
  if (authLoading || !user || loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">Chargement...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && myLists.length === 0) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">
            <p style={{ color: "#ef4444" }}>❌ {error}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: "1rem" }}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleAdd(deckId: string) {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      await addList(deckId);
    } catch (err) {
      console.error("Failed to add list:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove(deckId: string) {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      await removeList(deckId);
    } catch (err) {
      console.error("Failed to remove list:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(deckId: string) {
    if (actionLoading) return;
    // TODO: Add confirmation dialog
    try {
      setActionLoading(true);
      const { deleteDeck } = await import("../lib/api-cache");
      await deleteDeck(deckId);
      await reload();
    } catch (err) {
      console.error("Failed to delete deck:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStudy(deck: DeckFromApi) {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const cards = await getCards(deck.id);
      setStudyDeck(deck);
      setStudyCards(cards);
      setView("studying");
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  async function handleDeckCreated() {
    // Force refresh from API after creating a deck (bypasses cache)
    await forceRefresh();
    setView("available");
  }

  return (
    <>
      <div className="app">
        <div className="container">
          {view === "menu" && (
            <MenuView
              myLists={myLists}
              userName={user.firstName || user.email}
              onStudy={handleStudy}
              onExplore={() => setView("available")}
              onCreateDeck={() => setView("create")}
              onRemove={handleRemove}
              onLogout={handleLogout}
            />
          )}

          {view === "available" && (
            <AvailableView
              publicLists={allLists}
              personalLists={availablePersonalLists}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onBack={() => setView("menu")}
            />
          )}

          {view === "studying" && studyDeck && (
            <StudyView
              deck={studyDeck}
              cards={studyCards}
              onBack={() => setView("menu")}
            />
          )}

          {view === "create" && (
            <CreateDeckView
              onBack={() => setView("menu")}
              onCreated={handleDeckCreated}
            />
          )}

          {error && (
            <div className="card" style={{ background: "#fee", color: "#c00", marginTop: "1rem" }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      <SyncStatus />
    </>
  );
}
