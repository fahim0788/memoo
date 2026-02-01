"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchMyLists,
  fetchLists,
  fetchCards,
  addList,
  removeList,
  type DeckFromApi,
  type CardFromApi,
} from "../lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type View = "menu" | "available" | "studying";

type StudyState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function stateKey(deckId: string) {
  return `state:${deckId}`;
}

function buildStudyState(cards: CardFromApi[]): StudyState {
  const now = Date.now();
  const map: Record<string, CardState> = {};
  for (const c of cards) map[c.id] = defaultCardState(now);
  return { cards: map, doneToday: 0, lastActiveDay: todayKey() };
}

function pickNextDue(cards: CardFromApi[], state: StudyState) {
  const now = Date.now();
  const due = cards
    .map(c => ({ ...c, cs: state.cards[c.id] ?? defaultCardState(now) }))
    .filter(x => x.cs.nextReviewAt <= now)
    .sort((a, b) => a.cs.nextReviewAt - b.cs.nextReviewAt);
  return due[0] ?? null;
}

// ─── Menu View ──────────────────────────────────────────────────────────────

function MenuView({
  myLists,
  onStudy,
  onExplore,
  onRemove,
  onLogout,
}: {
  myLists: DeckFromApi[];
  onStudy: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onRemove: (deckId: string) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Memoo</h2>
          <button onClick={onLogout} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            Déconnexion
          </button>
        </div>
      </div>

      {myLists.length > 0 && (
        <div className="card">
          <div className="small">Mes listes</div>
          {myLists.map(deck => (
            <div key={deck.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="primary" style={{ flex: 1 }} onClick={() => onStudy(deck)}>
                {deck.name}
                <span className="small" style={{ display: "block", fontWeight: 400, marginTop: "2px" }}>
                  {deck.cardCount} cartes
                </span>
              </button>
              <button
                onClick={() => onRemove(deck.id)}
                style={{ flex: "none", minWidth: 0, width: "36px", padding: "8px", fontSize: "0.85rem" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {myLists.length === 0 && (
        <div className="card">
          <p className="small">Vous n'avez pas encore de liste. Explorez les listes disponibles ci-dessous.</p>
        </div>
      )}

      <div className="card">
        <button onClick={onExplore} style={{ margin: 0 }}>
          Explorer les listes disponibles
        </button>
      </div>
    </>
  );
}

// ─── Available View ─────────────────────────────────────────────────────────

function AvailableView({
  allLists,
  myListIds,
  onAdd,
  onBack,
}: {
  allLists: DeckFromApi[];
  myListIds: Set<string>;
  onAdd: (deckId: string) => void;
  onBack: () => void;
}) {
  const available = allLists.filter(d => !myListIds.has(d.id));

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Listes disponibles</h2>
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            ← Retour
          </button>
        </div>
      </div>

      {available.length === 0 && (
        <div className="card">
          <p className="small">Toutes les listes sont déjà dans vos listes.</p>
        </div>
      )}

      {available.map(deck => (
        <div className="card" key={deck.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{deck.name}</div>
              <div className="small">{deck.cardCount} cartes</div>
            </div>
            <button
              className="primary"
              onClick={() => onAdd(deck.id)}
              style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
            >
              Ajouter
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Study View ─────────────────────────────────────────────────────────────

function StudyView({
  deck,
  cards,
  onBack,
}: {
  deck: DeckFromApi;
  cards: CardFromApi[];
  onBack: () => void;
}) {
  const [study, setStudy] = useState<StudyState | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ ok: boolean; expected: string } | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    idbGet<StudyState>(stateKey(deck.id)).then(s => setStudy(s ?? buildStudyState(cards)));
  }, [deck.id, cards]);

  const current = useMemo(() => (study ? pickNextDue(cards, study) : null), [study, cards]);

  useEffect(() => {
    if (!showResult) {
      setAnswer("");
      setResult(null);
    }
  }, [current?.id, showResult]);

  function bumpDailyCounters(s: StudyState) {
    const t = todayKey();
    return s.lastActiveDay !== t ? { ...s, doneToday: 0, lastActiveDay: t } : s;
  }

  async function onValidate() {
    if (!study || !current || showResult) return;

    const ok = isCorrect(answer, current.answers);
    const next0 = bumpDailyCounters(study);
    const next: StudyState = {
      ...next0,
      doneToday: next0.doneToday + 1,
      cards: {
        ...next0.cards,
        [current.id]: gradeCard(next0.cards[current.id], ok),
      },
    };

    setResult({ ok, expected: current.answers[0] ?? "" });
    setShowResult(true);
    setStudy(next);
    await idbSet(stateKey(deck.id), next);

    queueReview({ cardId: current.id, ok, userAnswer: answer });
  }

  function goNext() {
    setShowResult(false);
  }

  if (!study) {
    return (
      <div className="card">Chargement...</div>
    );
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{deck.name}</h2>
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            ← Retour
          </button>
        </div>
        <span className="small">Aujourd'hui : <b>{study.doneToday}</b></span>
      </div>

      <div className="card">
        {!current ? (
          <>
            <span className="badge ok">🎉 Terminé</span>
            <p className="small">Aucune carte due pour le moment.</p>
          </>
        ) : (
          <>
            <div className="small">Question</div>
            <h3>{current.question}</h3>

            {!showResult && (
              <>
                <div className="input-wrapper">
                  <input
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Tape ta réponse…"
                    onKeyDown={e => e.key === "Enter" && onValidate()}
                  />
                </div>
                <div className="actions">
                  <button className="primary" onClick={onValidate}>Valider</button>
                  <button
                    onClick={() => {
                      setResult({ ok: false, expected: current.answers[0] ?? "" });
                      setShowResult(true);
                    }}
                  >
                    Voir la réponse
                  </button>
                </div>
              </>
            )}

            {showResult && result && (
              <>
                <span className={`badge ${result.ok ? "ok" : "bad"}`}>
                  {result.ok ? "✅ Correct" : "❌ Incorrect"}
                </span>
                <div className="small">
                  Référence : <b>{result.expected}</b>
                </div>
                <button className="primary" onClick={goNext}>Suivant</button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [view, setView] = useState<View>("menu");
  const [myLists, setMyLists] = useState<DeckFromApi[]>([]);
  const [allLists, setAllLists] = useState<DeckFromApi[]>([]);
  const [studyDeck, setStudyDeck] = useState<DeckFromApi | null>(null);
  const [studyCards, setStudyCards] = useState<CardFromApi[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [my, all] = await Promise.all([fetchMyLists(), fetchLists()]);
      setMyLists(my);
      setAllLists(all);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd(deckId: string) {
    await addList(deckId);
    await loadData();
  }

  async function handleRemove(deckId: string) {
    await removeList(deckId);
    await loadData();
  }

  async function handleStudy(deck: DeckFromApi) {
    const cards = await fetchCards(deck.id);
    setStudyDeck(deck);
    setStudyCards(cards);
    setView("studying");
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (loading || !user || dataLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
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
      </div>
    </div>
  );
}
