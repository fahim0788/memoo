"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";
import { STORAGE_BASE, type DeckFromApi, type CardFromApi } from "../lib/api";
import { updateStreak } from "../lib/streak";

function AudioButton({ url, label, autoPlay }: { url?: string | null; label: string; autoPlay?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  };

  // Reset audio when URL changes + autoplay if requested
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    if (autoPlay && url) {
      // Small delay to let the new Audio object be created in play()
      const t = setTimeout(play, 100);
      return () => clearTimeout(t);
    }
  }, [url, autoPlay]);

  if (!url) return null;

  return (
    <button
      onClick={play}
      style={{
        padding: "0.25rem 0.5rem",
        fontSize: "0.85rem",
        marginLeft: "0.5rem",
        opacity: playing ? 0.6 : 1,
      }}
      disabled={playing}
    >
      {playing ? "🔊" : "▶"} {label}
    </button>
  );
}

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
    updateStreak();

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h2>{deck.name}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              padding: "0.25rem 0.5rem",
              borderRadius: "8px",
              fontSize: "0.75rem",
              color: "#e5e7eb"
            }}>
              Aujourd'hui : <b>{study.doneToday}</b>
            </span>
            <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none", minWidth: "auto" }}>
              ← Retour
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {!current ? (
          <>
            <span className="badge ok">🎉 Terminé</span>
            <p className="small">Aucune carte due pour le moment.</p>
          </>
        ) : (
          <>
            <div className="small" style={{ display: "flex", alignItems: "center" }}>
              Question
              <AudioButton url={current.audioUrlEn ? `${STORAGE_BASE}${current.audioUrlEn}` : null} label="EN" autoPlay />
            </div>
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
                <div className="small" style={{ display: "flex", alignItems: "center", marginTop: "0.5rem" }}>
                  Référence : <b>{result.expected}</b>
                  <AudioButton url={current.audioUrlFr ? `${STORAGE_BASE}${current.audioUrlFr}` : null} label="FR" autoPlay />
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
