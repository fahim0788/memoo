"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";
import { STORAGE_BASE, type DeckFromApi, type CardFromApi } from "../lib/api";
import { updateStreak } from "../lib/streak";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { Header } from "./Header";

function AudioButton({ url, label, autoPlay, fullWidth }: { url?: string | null; label: string; autoPlay?: boolean; fullWidth?: boolean }) {
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
        padding: fullWidth ? "0.75rem 1rem" : "0.25rem 0.5rem",
        fontSize: fullWidth ? "1rem" : "0.85rem",
        marginLeft: fullWidth ? "0" : "0.5rem",
        opacity: playing ? 0.6 : 1,
        flex: fullWidth ? "1" : "none",
        minHeight: fullWidth ? "3rem" : "auto",
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
  userName?: string;
  onLogout?: () => void;
  onHome?: () => void;
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

export function StudyView({ deck, cards, onBack, userName, onLogout, onHome }: StudyViewProps) {
  useLanguage();
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
      <div className="card">{t.common.loading}</div>
    );
  }

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHome={onHome}
        title={deck.name}
        secondaryActions={
          <>
            <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none", minWidth: "auto" }}>
              {t.common.back}
            </button>
            <span style={{
              background: "var(--color-stats-bg)",
              border: "1px solid var(--color-stats-border)",
              padding: "0.25rem 0.5rem",
              borderRadius: "8px",
              fontSize: "0.75rem",
              color: "var(--color-stats-text)"
            }}>
              {t.study.todayLabel}<b>{study.doneToday}</b>
            </span>
          </>
        }
      />

      <div className="card">
        {!current ? (
          <>
            <span className="badge ok">{t.study.finished}</span>
            <p className="small">{t.study.noDueCards}</p>
          </>
        ) : (
          <>
            <div className="small">{t.study.question}</div>
            {current.imageUrl && (
              <div style={{ marginBottom: "1rem", textAlign: "center", padding: "1rem", border: "1px solid var(--color-image-border)", borderRadius: "8px", background: "var(--color-image-bg)" }}>
                <img
                  src={`${STORAGE_BASE}${current.imageUrl}`}
                  alt="Question illustration"
                  style={{ maxWidth: "100%", maxHeight: "16rem", margin: "0 auto", display: "block", border: "1px solid var(--color-image-border)" }}
                  loading="lazy"
                />
              </div>
            )}
            <h3>{current.question}</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <AudioButton url={current.audioUrlEn ? `${STORAGE_BASE}${current.audioUrlEn}` : null} label={t.study.listenEn} autoPlay fullWidth />
            </div>

            {!showResult && (
              <>
                <div className="input-wrapper">
                  <input
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder={t.study.typeYourAnswer}
                    onKeyDown={e => e.key === "Enter" && onValidate()}
                  />
                </div>
                <div className="actions">
                  <button className="primary" onClick={onValidate}>{t.study.validate}</button>
                  <button
                    onClick={() => {
                      setResult({ ok: false, expected: current.answers[0] ?? "" });
                      setShowResult(true);
                    }}
                  >
                    {t.study.showAnswer}
                  </button>
                </div>
              </>
            )}

            {showResult && result && (
              <>
                <span className={`badge ${result.ok ? "ok" : "bad"}`}>
                  {result.ok ? t.study.correct : t.study.incorrect}
                </span>
                <div className="small" style={{ marginTop: "0.5rem" }}>
                  {t.study.reference}<b>{result.expected}</b>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                  <AudioButton url={current.audioUrlFr ? `${STORAGE_BASE}${current.audioUrlFr}` : null} label={t.study.listenFr} autoPlay fullWidth />
                </div>
                <button className="primary" onClick={goNext}>{t.study.next}</button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
