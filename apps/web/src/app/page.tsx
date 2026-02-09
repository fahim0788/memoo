"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useLists } from "../hooks/useLists";
import { MenuView } from "../components/MenuView";
import { AvailableView } from "../components/AvailableView";
import { StudyView } from "../components/StudyView";
import { CreateDeckView } from "../components/CreateDeckView";
import { EditDeckView } from "../components/EditDeckView";
import { SyncStatus } from "../components/SyncStatus";
import { useStats } from "../hooks/useStats";
import type { DeckFromApi, CardFromApi } from "../lib/api";

type View = "menu" | "available" | "studying" | "create" | "editing";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { myLists, allLists, availablePersonalLists, loading, error, addList, removeList, getCards, reload, forceRefresh } = useLists();
  const { stats, refreshStats } = useStats(myLists);

  const [view, setView] = useState<View>("menu");
  const [studyDeck, setStudyDeck] = useState<DeckFromApi | null>(null);
  const [studyCards, setStudyCards] = useState<CardFromApi[]>([]);
  const [editDeck, setEditDeck] = useState<DeckFromApi | null>(null);
  const [editCards, setEditCards] = useState<CardFromApi[]>([]);
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
            <p style={{ color: "var(--color-error)", fontWeight: 600 }}>{error}</p>
            <button onClick={() => forceRefresh()} className="primary" style={{ marginTop: "0.5rem" }}>
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

  async function handleEdit(deck: DeckFromApi) {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const cards = await getCards(deck.id);
      setEditDeck(deck);
      setEditCards(cards);
      setView("editing");
    } catch (err) {
      console.error("Failed to load cards for editing:", err);
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
              onEdit={handleEdit}
              onExplore={() => setView("available")}
              onRemove={handleRemove}
              onLogout={handleLogout}
              stats={stats}
            />
          )}

          {view === "available" && (
            <AvailableView
              publicLists={allLists}
              personalLists={availablePersonalLists}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onCreateDeck={() => setView("create")}
              onBack={() => setView("menu")}
            />
          )}

          {view === "studying" && studyDeck && (
            <StudyView
              deck={studyDeck}
              cards={studyCards}
              onBack={() => {
                refreshStats();
                setView("menu");
              }}
            />
          )}

          {view === "editing" && editDeck && (
            <EditDeckView
              deck={editDeck}
              initialCards={editCards}
              onBack={async () => {
                await forceRefresh();
                setView("menu");
              }}
            />
          )}

          {view === "create" && (
            <CreateDeckView
              onBack={() => setView("menu")}
              onCreated={handleDeckCreated}
            />
          )}

          {error && (
            <div className="card" style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-error)", fontSize: "0.875rem" }}>{error}</span>
                <button
                  onClick={() => forceRefresh()}
                  style={{ minWidth: 0, flex: "none", padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SyncStatus />
    </>
  );
}
