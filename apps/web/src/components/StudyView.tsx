"use client";

import { useEffect, useMemo, useState } from "react";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";
import type { DeckFromApi, CardFromApi } from "../lib/api";

type StudyState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

type StudyViewProps = {
  deck: DeckFromApi;
  cards: CardFromApi[];
  onBack: () => void;
};

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

export function StudyView({ deck, cards, onBack }: StudyViewProps) {
  const [study, setStudy] = useState<StudyState | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ ok: boolean; expected: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pendingStudy, setPendingStudy] = useState<StudyState | null>(null);

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
    setPendingStudy(next);
    await idbSet(stateKey(deck.id), next);

    queueReview({ cardId: current.id, ok, userAnswer: answer });
  }

  function goNext() {
    if (pendingStudy) {
      setStudy(pendingStudy);
      setPendingStudy(null);
    }
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
