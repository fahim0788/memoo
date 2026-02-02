"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useLists } from "../hooks/useLists";
import { MenuView } from "../components/MenuView";
import { AvailableView } from "../components/AvailableView";
import { StudyView } from "../components/StudyView";
import { SyncStatus } from "../components/SyncStatus";
import type { DeckFromApi, CardFromApi } from "../lib/api";

type View = "menu" | "available" | "studying";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { myLists, allLists, loading, error, addList, removeList, getCards } = useLists();

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

  return (
    <>
      <div className="app">
        <div className="container">
          {view === "menu" && (
            <MenuView
              myLists={myLists}
              onStudy={handleStudy}
              onExplore={() => setView("available")}
              onRemove={handleRemove}
              onLogout={handleLogout}
            />
          )}

          {view === "available" && (
            <AvailableView
              allLists={allLists}
              myListIds={new Set(myLists.map(d => d.id))}
              onAdd={handleAdd}
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
