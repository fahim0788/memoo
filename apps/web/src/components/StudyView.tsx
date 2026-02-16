"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";
import { STORAGE_BASE, evaluateAnswer, type DeckFromApi, type CardFromApi } from "../lib/api";
import { updateStreak } from "../lib/streak";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { Header } from "./Header";
import { IconSpeaker, IconSpeakerPlaying } from "./Icons";
import { AnswerInput, type AnswerMode } from "./AnswerInput";

// Singleton audio — only one audio plays at a time across the entire study view
let activeAudio: HTMLAudioElement | null = null;
function stopActiveAudio() {
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
}
function playGlobal(url: string, onEnded?: () => void): HTMLAudioElement {
  stopActiveAudio();
  const audio = new Audio(url);
  activeAudio = audio;
  audio.onended = () => { if (activeAudio === audio) activeAudio = null; onEnded?.(); };
  audio.play().catch(() => { if (activeAudio === audio) activeAudio = null; });
  return audio;
}

function AudioButton({ url, label, autoPlay, fullWidth }: { url?: string | null; label: string; autoPlay?: boolean; fullWidth?: boolean }) {
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (!url) return;
    playGlobal(url, () => setPlaying(false));
    setPlaying(true);
  };

  // Reset when URL changes + autoplay if requested
  useEffect(() => {
    setPlaying(false);
    if (autoPlay && url) {
      const t = setTimeout(play, 100);
      return () => clearTimeout(t);
    }
  }, [url, autoPlay]);

  if (!url) return null;

  return (
    <button
      onClick={play}
      aria-label={label}
      className="audio-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: fullWidth ? "0.75rem" : "0.25rem 0.5rem",
        marginLeft: fullWidth ? "0" : "0.5rem",
        opacity: playing ? 0.6 : 1,
        flex: fullWidth ? "1" : "none",
        minHeight: fullWidth ? "3rem" : "auto",
      }}
      disabled={playing}
    >
      {playing ? <IconSpeakerPlaying size={fullWidth ? 24 : 18} /> : <IconSpeaker size={fullWidth ? 24 : 18} />}
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
  chapterName?: string | null;
  chapterColor?: string | null;
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
};

import { debugNow, debugDate } from "../lib/debug-date";

function todayKey(d = debugDate()) {
  return d.toISOString().slice(0, 10);
}

function stateKey(deckId: string) {
  return `state:${deckId}`;
}

function buildStudyState(cards: CardFromApi[]): StudyState {
  const now = debugNow();
  const map: Record<string, CardState> = {};
  for (const c of cards) map[c.id] = defaultCardState(now);
  return { cards: map, doneToday: 0, lastActiveDay: todayKey() };
}

function pickNextDue(cards: CardFromApi[], state: StudyState) {
  const now = debugNow();
  const due = cards
    .map(c => ({ ...c, cs: state.cards[c.id] ?? defaultCardState(now) }))
    .filter(x => x.cs.nextReviewAt <= now);
  if (due.length === 0) return null;
  // Random pick among due cards for variety
  return due[Math.floor(Math.random() * due.length)];
}

export function StudyView({ deck, cards, chapterName, chapterColor, onBack, userName, onLogout, onHelp, onProfile }: StudyViewProps) {
  useLanguage();
  const [study, setStudy] = useState<StudyState | null>(null);
  const [result, setResult] = useState<{ ok: boolean; expected: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [pendingStudy, setPendingStudy] = useState<StudyState | null>(null);
  const [initialDue, setInitialDue] = useState<number | null>(null);
  const [frozenCard, setFrozenCard] = useState<(typeof cards)[number] | null>(null);
  const answeringRef = useRef(false);
  const resultShownAtRef = useRef(0);

  useEffect(() => {
    idbGet<StudyState>(stateKey(deck.id)).then(s => {
      const studyState = s ?? buildStudyState(cards);
      setStudy(studyState);
      const now = debugNow();
      const dueCount = cards.filter(c => {
        const cs = studyState.cards[c.id];
        return !cs || cs.nextReviewAt <= now;
      }).length;
      setInitialDue(dueCount);
    });
  }, [deck.id, cards]);

  const computed = useMemo(() => (study ? pickNextDue(cards, study) : null), [study, cards]);
  // Lock current card while result/evaluation is visible to prevent random re-picks
  const current = frozenCard ?? computed;

  const progress = useMemo(() => {
    if (!study || initialDue === null) return { done: 0, total: 0 };
    const now = debugNow();
    const stillDue = cards.filter(c => {
      const cs = study.cards[c.id];
      return !cs || cs.nextReviewAt <= now;
    }).length;
    const done = Math.max(0, initialDue - stillDue);
    return { done, total: initialDue };
  }, [study, cards, initialDue]);

  function bumpDailyCounters(s: StudyState) {
    const t = todayKey();
    return s.lastActiveDay !== t ? { ...s, doneToday: 0, lastActiveDay: t } : s;
  }

  // Play answer audio — must be called first in user gesture context
  function playAnswerAudio(card: CardFromApi) {
    if (!card.audioUrlFr) return;
    playGlobal(`${STORAGE_BASE}${card.audioUrlFr}`);
  }

  function handleAnswer(userAnswer: string, mode?: AnswerMode) {
    if (!study || !current || showResult || evaluating || answeringRef.current) return;
    answeringRef.current = true;

    // Play answer audio FIRST — synchronous, in user gesture context
    playAnswerAudio(current);
    setFrozenCard(current);

    const ok = isCorrect(userAnswer, current.answers);

    const next0 = bumpDailyCounters(study);
    const next: StudyState = {
      ...next0,
      doneToday: next0.doneToday + 1,
      cards: {
        ...next0.cards,
        [current.id]: gradeCard(next0.cards[current.id] ?? defaultCardState(), ok),
      },
    };

    setResult({ ok, expected: current.answers[0] ?? "" });
    setShowResult(true);
    resultShownAtRef.current = Date.now();
    setPendingStudy(next);
    idbSet(stateKey(deck.id), next);
    updateStreak();
    queueReview({ cardId: current.id, ok, userAnswer });

    // AI evaluation async (runs after result is shown, may upgrade ok → correct)
    const shouldAiVerify = current.aiVerify ?? deck.aiVerify ?? true;
    if (!ok && shouldAiVerify && mode === "text" && typeof navigator !== "undefined" && navigator.onLine) {
      setEvaluating(true);
      evaluateAnswer(current.id, userAnswer, current.question, current.answers as string[])
        .then(res => {
          if (res.acceptable) {
            if (!current.answers.includes(userAnswer.trim())) {
              current.answers.push(userAnswer.trim());
            }
            // Upgrade result to correct
            const corrected: StudyState = {
              ...next0,
              doneToday: next0.doneToday + 1,
              cards: {
                ...next0.cards,
                [current.id]: gradeCard(next0.cards[current.id] ?? defaultCardState(), true),
              },
            };
            setResult({ ok: true, expected: current.answers[0] ?? "" });
            setPendingStudy(corrected);
            idbSet(stateKey(deck.id), corrected);
            queueReview({ cardId: current.id, ok: true, userAnswer });
          }
        })
        .catch(() => {})
        .finally(() => setEvaluating(false));
    }
  }

  function handleShowAnswer() {
    if (!current) return;
    // Play answer audio FIRST — synchronous, in user gesture context
    playAnswerAudio(current);
    setFrozenCard(current);
    setResult({ ok: false, expected: current.answers[0] ?? "" });
    setShowResult(true);
    resultShownAtRef.current = Date.now();
  }

  function goNext() {
    // Block ghost clicks from pointerup landing on "Suivant" right after submit
    if (Date.now() - resultShownAtRef.current < 500) return;
    answeringRef.current = false;
    stopActiveAudio();
    if (pendingStudy) {
      setStudy(pendingStudy);
      setPendingStudy(null);
    }
    setFrozenCard(null);
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
        onHelp={onHelp}
        onProfile={onProfile}
        title={
          chapterName ? (
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deck.name}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chapterName}</span>
            </span>
          ) : deck.name
        }
        onBack={onBack}
      />

      {cards.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 0.25rem",
        }}>
          <div style={{
            flex: 1,
            height: "6px",
            borderRadius: "3px",
            background: "var(--color-border)",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
              height: "100%",
              borderRadius: "3px",
              background: chapterColor || "#a3e635",
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {progress.done}/{progress.total}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-stats-text)", whiteSpace: "nowrap", opacity: 0.7 }}>
            · {t.study.todayLabel}{study.doneToday}
          </span>
        </div>
      )}

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
              <div style={{ marginBottom: "1rem", textAlign: "center", padding: "1rem", borderRadius: "8px", background: "var(--color-image-bg)" }}>
                <img
                  src={`${STORAGE_BASE}${current.imageUrl}`}
                  alt="Question illustration"
                  style={{ maxWidth: "100%", maxHeight: "16rem", margin: "0 auto", display: "block", borderRadius: "4px" }}
                  loading="lazy"
                />
              </div>
            )}
            <h3>{current.question}</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <AudioButton url={current.audioUrlEn ? `${STORAGE_BASE}${current.audioUrlEn}` : null} label={t.study.listenQuestion} autoPlay fullWidth />
            </div>

            {!showResult && !evaluating && (
              <AnswerInput
                key={current.id}
                card={current}
                allCards={cards}
                allowedModes={current.allowedModes ?? deck.allowedModes ?? null}
                onAnswer={handleAnswer}
                onShowAnswer={handleShowAnswer}
              />
            )}

            {evaluating && (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {t.study.evaluating}
                </div>
              </div>
            )}

            {showResult && result && (
              <>
                <div style={{ textAlign: "center" }}>
                  <span className={`badge ${result.ok ? "ok" : "bad"}`}>
                    {result.ok ? t.study.correct : t.study.incorrect}
                  </span>
                </div>
                <div className="small" style={{ marginTop: "1rem" }}>{t.study.reference}</div>
                <h3 style={{ color: "#76b900" }}>{result.expected}</h3>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <AudioButton url={current.audioUrlFr ? `${STORAGE_BASE}${current.audioUrlFr}` : null} label={t.study.listenAnswer} fullWidth />
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
