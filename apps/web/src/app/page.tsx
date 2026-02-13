"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useLists } from "../hooks/useLists";
import { MenuView } from "../components/MenuView";
import { AvailableView } from "../components/AvailableView";
import { StudyView } from "../components/StudyView";
import { CreateDeckView } from "../components/CreateDeckView";
import { EditDeckView } from "../components/EditDeckView";
import { ChapterPickerView } from "../components/ChapterPickerView";
import { HelpView } from "../components/HelpView";
import { ProfileView } from "../components/ProfileView";
import { SyncStatus } from "../components/SyncStatus";
import { BottomNav } from "../components/BottomNav";
import { useStats } from "../hooks/useStats";
import { useChapterProgress } from "../hooks/useChapterProgress";
import type { DeckFromApi, CardFromApi, ChapterFromApi } from "../lib/api";
import { idbSet } from "../lib/idb";
import { suggestIcon } from "../lib/icon-suggest";
import { markChapterStarted, markAllChaptersStarted } from "../lib/chapter-progress";

type View = "menu" | "available" | "studying" | "create" | "editing" | "chapters" | "help" | "profile";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { myLists, allLists, availablePersonalLists, loading, error, addList, removeList, reorderLists, getCards, reload, forceRefresh } = useLists();
  const { stats, refreshStats } = useStats(myLists);
  const { progressMap, refreshProgress } = useChapterProgress(myLists.map(d => d.id));

  const [view, setView] = useState<View>("menu");
  const [studyDeck, setStudyDeck] = useState<DeckFromApi | null>(null);
  const [studyCards, setStudyCards] = useState<CardFromApi[]>([]);
  const [editDeck, setEditDeck] = useState<DeckFromApi | null>(null);
  const [editCards, setEditCards] = useState<CardFromApi[]>([]);
  const [chapters, setChapters] = useState<ChapterFromApi[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (!authLoading && !user) {
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
      // Find deck name for icon suggestion
      const deck = allLists.find(d => d.id === deckId) || availablePersonalLists.find(d => d.id === deckId);
      const icon = deck ? suggestIcon(deck.name) : undefined;
      await addList(deckId, icon);
    } catch (err) {
      console.error("Failed to add list:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeIcon(deckId: string, icon: string) {
    try {
      const { updateDeckIcon } = await import("../lib/api");
      await updateDeckIcon(deckId, icon);
      await forceRefresh();
    } catch (err) {
      console.error("Failed to update icon:", err);
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

  async function handleReorder(deckIds: string[]) {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      await reorderLists(deckIds);
    } catch (err) {
      console.error("Failed to reorder lists:", err);
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
      const { fetchChapters, fetchCards } = await import("../lib/api");
      const [cards, chaps] = await Promise.all([
        fetchCards(deck.id), // Direct API call to get fresh chapterId
        fetchChapters(deck.id).catch(() => [] as ChapterFromApi[]),
      ]);
      // Cache in IDB so useChapterProgress can read them
      await Promise.all([
        idbSet(`cache:cards:${deck.id}`, { data: cards, timestamp: Date.now() }),
        idbSet(`cache:chapters:${deck.id}`, { data: chaps, timestamp: Date.now() }),
      ]);
      setStudyDeck(deck);
      setStudyCards(cards);
      setChapters(chaps);
      setView("chapters");
      refreshProgress();
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setActionLoading(false);
    }
  }

  function handleStudyAll() {
    if (studyDeck && chapters.length > 0) {
      markAllChaptersStarted(studyDeck.id, chapters.map(ch => ch.id));
    }
    setSelectedChapterId(null);
    setView("studying");
  }

  function handleStudyChapter(chapterId: string) {
    if (studyDeck) {
      markChapterStarted(studyDeck.id, chapterId);
    }
    setSelectedChapterId(chapterId);
    setView("studying");
  }

  async function handleClassify() {
    if (!studyDeck || classifying) return;
    try {
      setClassifying(true);
      const { classifyDeck, fetchChapters, fetchCards } = await import("../lib/api");
      await classifyDeck(studyDeck.id);
      const [chaps, cards] = await Promise.all([
        fetchChapters(studyDeck.id),
        fetchCards(studyDeck.id), // Direct API call, not cache (chapterId must be fresh)
      ]);
      await Promise.all([
        idbSet(`cache:cards:${studyDeck.id}`, { data: cards, timestamp: Date.now() }),
        idbSet(`cache:chapters:${studyDeck.id}`, { data: chaps, timestamp: Date.now() }),
      ]);
      setChapters(chaps);
      setStudyCards(cards);
      refreshProgress();
    } catch (err) {
      console.error("Failed to classify deck:", err);
    } finally {
      setClassifying(false);
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

  function handleHome() {
    setView("menu");
  }

  function handleHelp() {
    setView("help");
  }

  function handleProfile() {
    setView("profile");
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
              onRemove={handleRemove}
              onReorder={handleReorder}
              onChangeIcon={handleChangeIcon}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
              stats={stats}
              chapterProgress={progressMap}
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
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
            />
          )}

          {view === "chapters" && studyDeck && (
            <ChapterPickerView
              deck={studyDeck}
              chapters={chapters}
              totalCardCount={studyCards.length}
              classifying={classifying}
              chapterStatuses={progressMap[studyDeck.id]?.statuses}
              onStudyAll={handleStudyAll}
              onStudyChapter={handleStudyChapter}
              onClassify={handleClassify}
              onBack={() => {
                setView("menu");
              }}
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
            />
          )}

          {view === "studying" && studyDeck && (
            <StudyView
              deck={studyDeck}
              cards={selectedChapterId ? studyCards.filter(c => c.chapterId === selectedChapterId) : studyCards}
              chapterName={selectedChapterId ? chapters.find(ch => ch.id === selectedChapterId)?.name : null}
              onBack={() => {
                refreshStats();
                refreshProgress();
                setSelectedChapterId(null);
                if (chapters.length > 0) {
                  setView("chapters");
                } else {
                  setView("menu");
                }
              }}
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
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
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
            />
          )}

          {view === "create" && (
            <CreateDeckView
              onBack={() => setView("menu")}
              onCreated={handleDeckCreated}
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
              onProfile={handleProfile}
            />
          )}

          {view === "help" && (
            <HelpView
              onBack={() => setView("menu")}
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onProfile={handleProfile}
            />
          )}

          {view === "profile" && (
            <ProfileView
              onBack={() => setView("menu")}
              userName={user.firstName || user.email}
              onLogout={handleLogout}
              onHelp={handleHelp}
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

      {view !== "studying" && (
        <BottomNav
          activeView={view}
          onHome={handleHome}
          onExplore={() => setView("available")}
          onCreate={() => setView("create")}
        />
      )}

      <SyncStatus />
    </>
  );
}
