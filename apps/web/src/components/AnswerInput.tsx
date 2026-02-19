"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { CardFromApi } from "../lib/api";
import { generateDistractors } from "../lib/api";
import { normalizeText } from "../lib/text";
import { t } from "../lib/i18n";
import { MiniKeyboard } from "./MiniKeyboard";

// ─── Types ────────────────────────────────────────────────────

export type AnswerMode = "text" | "yesno" | "number" | "scramble" | "mcq" | "fillblank";

type AnswerInputProps = {
  card: CardFromApi;
  allCards: CardFromApi[];
  allowedModes?: string[] | null;
  onAnswer: (answer: string, mode: AnswerMode) => void;
  onShowAnswer: () => void;
};

// ─── Utilities ────────────────────────────────────────────────

/** Deterministic hash for stable mode selection per card+day */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Shuffle array deterministically with seed (uses Math.imul to avoid overflow) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** True random shuffle (Fisher-Yates with Math.random) */
function randomShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pick noise words from other cards in the deck */
function pickNoiseWords(card: CardFromApi, allCards: CardFromApi[], answerWords: string[], count: number): string[] {
  const answerSet = new Set(answerWords.map(w => w.toLowerCase()));
  const candidates: string[] = [];
  for (const c of allCards) {
    if (c.id === card.id) continue;
    const words = (c.answers[0] ?? "").trim().split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && !answerSet.has(w.toLowerCase())) candidates.push(w);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length === 0) return [];
  return seededShuffle(unique, hashCode(card.id) + 777).slice(0, count);
}

/** Pick random word indices to blank out (all words eligible) */
function pickBlankIndices(words: string[], seed: number): number[] {
  const indices = words.map((_, i) => i);
  const count = Math.min(indices.length, words.length <= 4 ? 1 : words.length <= 8 ? 2 : 3);
  return seededShuffle(indices, seed).slice(0, count).sort((a, b) => a - b);
}

const YES_NO_VALUES = ["oui", "non", "yes", "no", "vrai", "faux", "true", "false"];

/** Check if a mode is allowed */
function isAllowed(mode: AnswerMode, allowedModes?: string[] | null): boolean {
  if (!allowedModes || allowedModes.length === 0) return true;
  return allowedModes.includes(mode);
}

/** Detect best input mode for a card */
function detectMode(card: CardFromApi, allCards: CardFromApi[], allowedModes?: string[] | null): AnswerMode {
  const answer = card.answers[0] ?? "";
  const norm = normalizeText(answer);

  // Yes/No → always buttons
  if (YES_NO_VALUES.includes(norm) && isAllowed("yesno", allowedModes)) return "yesno";

  // Number → always choice
  if (/^\d+([.,]\d+)?$/.test(norm.replace(/\s/g, "")) && isAllowed("number", allowedModes)) return "number";

  // Seed varies per card + per day for variety
  const daySeed = Math.floor(Date.now() / 86400000);
  const seed = hashCode(card.id) + daySeed;
  const roll = seed % 10;

  const words = answer.trim().split(/\s+/);

  // Multi-word (3+) → scramble / fillblank / mcq / text
  if (words.length >= 3) {
    if (roll < 4 && isAllowed("scramble", allowedModes)) return "scramble";
    if (roll < 6 && isAllowed("fillblank", allowedModes)) return "fillblank";
    if (roll < 8 && allCards.length >= 4 && isAllowed("mcq", allowedModes)) return "mcq";
    if (isAllowed("text", allowedModes)) return "text";
  }

  // Short answers → mcq / text
  if (allCards.length >= 4 && roll < 4 && isAllowed("mcq", allowedModes)) return "mcq";

  if (isAllowed("text", allowedModes)) return "text";
  // Ultimate fallback: return first allowed mode or text
  return "text";
}

// ─── YesNo ────────────────────────────────────────────────────

function YesNoInput({ card, onAnswer, onShowAnswer }: {
  card: CardFromApi;
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const norm = normalizeText(card.answers[0] ?? "");

  let yesLabel: string, noLabel: string;
  if (["oui", "non"].includes(norm)) { yesLabel = "Oui"; noLabel = "Non"; }
  else if (["yes", "no"].includes(norm)) { yesLabel = "Yes"; noLabel = "No"; }
  else if (["vrai", "faux"].includes(norm)) { yesLabel = "Vrai"; noLabel = "Faux"; }
  else { yesLabel = "True"; noLabel = "False"; }

  return (
    <>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => onAnswer(yesLabel.toLowerCase())}
          style={{
            flex: 1, padding: "1rem", fontSize: "1.1rem", fontWeight: 600,
            borderRadius: "12px",
            background: "var(--color-success-light)",
            border: "2px solid var(--color-success-border)",
            color: "var(--color-success)",
          }}
        >
          {yesLabel}
        </button>
        <button
          onClick={() => onAnswer(noLabel.toLowerCase())}
          style={{
            flex: 1, padding: "1rem", fontSize: "1.1rem", fontWeight: 600,
            borderRadius: "12px",
            background: "var(--color-error-light)",
            border: "2px solid var(--color-error-border)",
            color: "var(--color-error)",
          }}
        >
          {noLabel}
        </button>
      </div>
      <button onClick={onShowAnswer} style={{ marginTop: "0.25rem" }}>
        {t.study.showAnswer}
      </button>
    </>
  );
}

// ─── NumberChoice ─────────────────────────────────────────────

function NumberInput({ card, onAnswer, onShowAnswer }: {
  card: CardFromApi;
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const answer = card.answers[0] ?? "0";
  const num = parseFloat(answer.replace(",", "."));
  const hash = hashCode(card.id);

  // Detect if the answer looks like a year (4 digits, 1000–current year)
  const currentYear = new Date().getFullYear();
  const isYear = Number.isInteger(num) && num >= 1000 && num <= currentYear;

  // Generate 2 noise numbers near the correct one
  const range = isYear
    ? Math.max((hash % 15) + 3, 3)   // years: ±3 to ±17 years
    : Math.max(Math.ceil(Math.abs(num) * 0.3), 2);
  let n1 = num + ((hash % range) + 1);
  let n2 = num - (((hash >> 4) % range) + 1);
  if (n1 === num) n1 = num + range + 1;
  if (n2 === num) n2 = num - range - 1;
  if (n1 === n2) n2 = n2 - 1;
  if (Number.isInteger(num)) { n1 = Math.round(n1); n2 = Math.round(n2); }

  // Never propose a year in the future
  if (isYear) {
    if (n1 > currentYear) n1 = num - ((hash % range) + range + 1);
    if (n2 > currentYear) n2 = num - ((hash >> 8) % range + range + 2);
    // Ensure all three are distinct
    if (n1 === num) n1 = num - range - 1;
    if (n2 === num) n2 = num - range - 2;
    if (n1 === n2) n2 = n2 - 1;
  }

  const [numShuffleSeed] = useState(() => (Math.random() * 0x7fffffff) | 0);
  const options = useMemo(
    () => seededShuffle([answer, String(n1), String(n2)], numShuffleSeed),
    [card.id, numShuffleSeed],
  );

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {options.map((opt, i) => (
          <button
            key={i}
            className="primary"
            onClick={() => onAnswer(opt)}
            style={{ flex: 1, minWidth: "80px", padding: "1rem", fontSize: "1.2rem", fontWeight: 600 }}
          >
            {opt}
          </button>
        ))}
      </div>
      <button onClick={onShowAnswer} style={{ marginTop: "0.25rem" }}>
        {t.study.showAnswer}
      </button>
    </>
  );
}

// ─── WordScramble ─────────────────────────────────────────────

function ScrambleInput({ card, allCards, onAnswer, onShowAnswer }: {
  card: CardFromApi;
  allCards: CardFromApi[];
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const answer = card.answers[0] ?? "";
  const words = answer.trim().split(/\s+/);
  const noiseCount = words.length <= 4 ? 1 : 2;
  const noiseWords = useMemo(
    () => pickNoiseWords(card, allCards, words, noiseCount),
    [card.id, allCards.length],
  );
  const shuffled = useMemo(
    () => seededShuffle(
      [
        ...words.map((w, i) => ({ word: w, origIdx: i, isNoise: false })),
        ...noiseWords.map((w) => ({ word: w, origIdx: -1, isNoise: true })),
      ],
      hashCode(card.id),
    ),
    [card.id, noiseWords],
  );

  const expectedCount = words.length;
  const [placed, setPlaced] = useState<number[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => { setPlaced([]); setDragIdx(null); }, [card.id]);

  const available = shuffled
    .map((item, shuffleIdx) => ({ ...item, shuffleIdx }))
    .filter(x => !placed.includes(x.shuffleIdx));

  const placedWords = placed.map(i => shuffled[i].word);

  const addWord = (shuffleIdx: number) => {
    const next = [...placed, shuffleIdx];
    setPlaced(next);
    // Auto-validate when expected word count is placed
    if (next.length === expectedCount) {
      const assembled = next.map(i => shuffled[i].word).join(" ");
      setTimeout(() => onAnswer(assembled), 350);
    }
  };

  const removeWord = (posInPlaced: number) => {
    setPlaced(prev => prev.filter((_, i) => i !== posInPlaced));
  };

  // HTML5 drag & drop (desktop)
  const handleDragStart = (shuffleIdx: number) => (e: React.DragEvent) => {
    setDragIdx(shuffleIdx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx !== null && !placed.includes(dragIdx)) addWord(dragIdx);
    setDragIdx(null);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const chipBase: React.CSSProperties = {
    padding: "0.45rem 0.75rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.15s ease",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          minHeight: "3.5rem",
          padding: "0.5rem",
          borderRadius: "12px",
          border: `2px dashed ${placed.length > 0 ? "var(--color-success-border)" : "var(--color-border)"}`,
          background: placed.length > 0 ? "var(--color-success-light)" : "var(--color-bg-tertiary)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          alignItems: "center",
          transition: "all 0.2s ease",
        }}
      >
        {placedWords.length === 0 && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}>
            {t.study.scramblePlaceholder}
          </span>
        )}
        {placedWords.map((w, i) => (
          <span
            key={`placed-${placed[i]}-${i}`}
            onClick={() => removeWord(i)}
            className="answer-chip-enter"
            style={{
              ...chipBase,
              background: "var(--color-success)",
              color: "white",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Available words */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
        {available.map(({ word, shuffleIdx }) => (
          <span
            key={shuffleIdx}
            draggable
            onDragStart={handleDragStart(shuffleIdx)}
            onClick={() => addWord(shuffleIdx)}
            style={{
              ...chipBase,
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              cursor: "grab",
            }}
          >
            {word}
          </span>
        ))}
      </div>

      <button onClick={onShowAnswer}>{t.study.showAnswer}</button>
    </div>
  );
}

// ─── MCQ (AI distractors with fallback to deck) ──────────────

/** Fallback: distractors from other cards in the deck */
function deckDistractors(card: CardFromApi, allCards: CardFromApi[]): string[] {
  const answer = card.answers[0] ?? "";
  const normAnswer = normalizeText(answer);
  const others = [...new Set(
    allCards
      .filter(c => c.id !== card.id)
      .map(c => c.answers[0] ?? "")
      .filter(a => a && normalizeText(a) !== normAnswer),
  )];
  return seededShuffle(others, hashCode(card.id)).slice(0, 3);
}

function McqInput({ card, allCards, onAnswer, onShowAnswer }: {
  card: CardFromApi;
  allCards: CardFromApi[];
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const answer = card.answers[0] ?? "";
  const hasStoredDistractors = card.distractors && card.distractors.length > 0;

  const [aiDistractors, setAiDistractors] = useState<string[] | null>(
    hasStoredDistractors ? card.distractors : null,
  );
  const [loading, setLoading] = useState(false);

  // Ask AI for distractors on first encounter (no stored distractors)
  useEffect(() => {
    if (hasStoredDistractors || aiDistractors !== null) return;
    if (typeof navigator === "undefined" || !navigator.onLine) return;

    let cancelled = false;
    setLoading(true);
    generateDistractors(card.id, card.question, answer)
      .then(res => {
        if (!cancelled && res.distractors.length > 0) {
          setAiDistractors(res.distractors);
          // Update local card data so it's cached for the session
          card.distractors = res.distractors;
        }
      })
      .catch(() => { /* fallback to deck distractors */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [card.id]);

  const options = useMemo(() => {
    const distractors = (aiDistractors && aiDistractors.length > 0)
      ? aiDistractors.slice(0, 3)
      : deckDistractors(card, allCards);
    return randomShuffle([answer, ...distractors]);
  }, [card.id, aiDistractors, allCards.length]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
          {t.study.evaluating}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {options.map((opt, i) => (
          <button
            key={i}
            className="primary"
            onClick={() => onAnswer(opt)}
            style={{ width: "100%", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.95rem" }}
          >
            {opt}
          </button>
        ))}
      </div>
      <button onClick={onShowAnswer} style={{ marginTop: "0.25rem" }}>
        {t.study.showAnswer}
      </button>
    </>
  );
}

// ─── FillBlank (algorithmic blanks + noise words from deck) ──

function FillBlankInput({ card, allCards, onAnswer, onShowAnswer }: {
  card: CardFromApi;
  allCards: CardFromApi[];
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const answer = card.answers[0] ?? "";
  const answerWords = useMemo(() => answer.trim().split(/\s+/), [answer]);

  // Algorithmically pick which words to blank (deterministic per card+day)
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const blankIdxList = useMemo(
    () => pickBlankIndices(answerWords, hashCode(card.id) + daySeed),
    [card.id, answerWords],
  );
  const blankIndices = useMemo(() => new Set(blankIdxList), [blankIdxList]);

  // Correct words = the blanked-out words (always in chips)
  // Noise words = from other cards in the deck (not MCQ distractors which are answer-level)
  const allChips = useMemo(() => {
    const correct = blankIdxList.map(i => answerWords[i]);
    const noiseCount = Math.max(2, correct.length * 2);
    const noise = pickNoiseWords(card, allCards, answerWords, noiseCount);
    return seededShuffle([...correct, ...noise], hashCode(card.id));
  }, [card.id, blankIdxList, answerWords, allCards.length]);

  // State: which blank slot the user is currently filling
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());

  useEffect(() => { setFilled({}); setUsedChips(new Set()); }, [card.id]);

  // Find next unfilled blank index
  const nextBlankIdx = blankIdxList.find(i => filled[i] === undefined) ?? null;

  const handleChipClick = (chip: string) => {
    if (nextBlankIdx === null) return;
    const newFilled = { ...filled, [nextBlankIdx]: chip };
    const newUsed = new Set(usedChips);
    // Mark a unique instance as used
    let found = false;
    for (let i = 0; i < allChips.length; i++) {
      const key = `${allChips[i]}:${i}`;
      if (allChips[i] === chip && !newUsed.has(key)) {
        newUsed.add(key);
        found = true;
        break;
      }
    }
    if (!found) return; // Already all used
    setFilled(newFilled);
    setUsedChips(newUsed);

    // Auto-submit when all blanks filled
    if (Object.keys(newFilled).length === blankIdxList.length) {
      const assembled = answerWords.map((w, i) =>
        blankIndices.has(i) ? (newFilled[i] ?? w) : w,
      ).join(" ");
      setTimeout(() => onAnswer(assembled), 350);
    }
  };

  const handleBlankClick = (blankIndex: number) => {
    if (filled[blankIndex] === undefined) return;
    const word = filled[blankIndex];
    // Remove from filled
    const newFilled = { ...filled };
    delete newFilled[blankIndex];
    setFilled(newFilled);
    // Free up a chip
    const newUsed = new Set(usedChips);
    for (let i = 0; i < allChips.length; i++) {
      const key = `${allChips[i]}:${i}`;
      if (allChips[i] === word && newUsed.has(key)) {
        newUsed.delete(key);
        break;
      }
    }
    setUsedChips(newUsed);
  };

  // Count how many of each chip word are used
  const usedCounts: Record<string, number> = {};
  for (const key of usedChips) {
    const word = key.split(":")[0];
    usedCounts[word] = (usedCounts[word] ?? 0) + 1;
  }
  const totalCounts: Record<string, number> = {};
  for (const c of allChips) totalCounts[c] = (totalCounts[c] ?? 0) + 1;

  const chipBase: React.CSSProperties = {
    padding: "0.45rem 0.75rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.15s ease",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Sentence with blanks */}
      <div style={{
        padding: "0.75rem",
        borderRadius: "12px",
        background: "var(--color-bg-tertiary)",
        lineHeight: 2,
        fontSize: "1rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.3rem",
        alignItems: "center",
      }}>
        {answerWords.map((w, i) => {
          if (!blankIndices.has(i)) {
            return <span key={i}>{w}</span>;
          }
          const filledWord = filled[i];
          const isNext = i === nextBlankIdx;
          return (
            <span
              key={i}
              onClick={() => handleBlankClick(i)}
              style={{
                display: "inline-block",
                minWidth: "4rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                border: `2px ${isNext ? "solid" : "dashed"} ${filledWord ? "var(--color-success-border)" : isNext ? "var(--color-primary)" : "var(--color-border)"}`,
                background: filledWord ? "var(--color-success-light)" : "var(--color-bg)",
                color: filledWord ? "var(--color-success)" : "var(--color-text-muted)",
                fontWeight: 600,
                textAlign: "center",
                cursor: filledWord ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
            >
              {filledWord || "___"}
            </span>
          );
        })}
      </div>

      {/* Chip pool */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
        {allChips.map((chip, i) => {
          const available = (totalCounts[chip] ?? 0) - (usedCounts[chip] ?? 0);
          if (available <= 0) return null;
          // Only render one button per available instance
          const renderedSoFar = allChips.slice(0, i).filter(c => c === chip && (totalCounts[c] ?? 0) - (usedCounts[c] ?? 0) > 0).length;
          if (renderedSoFar >= available) return null;
          return (
            <span
              key={i}
              onClick={() => handleChipClick(chip)}
              style={{
                ...chipBase,
                background: "var(--color-bg-tertiary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                cursor: nextBlankIdx !== null ? "pointer" : "default",
                opacity: nextBlankIdx !== null ? 1 : 0.5,
              }}
            >
              {chip}
            </span>
          );
        })}
      </div>

      <button onClick={onShowAnswer}>{t.study.showAnswer}</button>
    </div>
  );
}

// ─── TextInput (classic fallback) ─────────────────────────────

function TextInputMode({ onAnswer, onShowAnswer }: {
  onAnswer: (a: string) => void;
  onShowAnswer: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-focus on desktop so user can type immediately
  useEffect(() => {
    if (isDesktop && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDesktop]);

  const handleChar = useCallback((char: string) => {
    setText(prev => prev + char);
  }, []);

  const handleBackspace = useCallback(() => {
    setText(prev => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (text.trim()) onAnswer(text);
  }, [text, onAnswer]);

  return (
    <>
      <div className="input-wrapper">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputMode={isDesktop ? "text" : "none"}
          placeholder={t.study.typeYourAnswer}
          onKeyDown={e => e.key === "Enter" && text.trim() && onAnswer(text)}
          autoComplete="off"
        />
        {isDesktop && (
          <button
            className="desktop-submit-btn"
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            {t.study.validate}
          </button>
        )}
      </div>
      <MiniKeyboard
        onChar={handleChar}
        onBackspace={handleBackspace}
        onSubmit={handleSubmit}
      />
      <button onClick={onShowAnswer}>{t.study.showAnswer}</button>
    </>
  );
}

// ─── Main AnswerInput component ───────────────────────────────

export function AnswerInput({ card, allCards, allowedModes, onAnswer, onShowAnswer }: AnswerInputProps) {
  const mode = useMemo(() => detectMode(card, allCards, allowedModes), [card.id, allCards.length, allowedModes]);

  const handleAnswer = (answer: string) => onAnswer(answer, mode);

  switch (mode) {
    case "yesno":
      return <YesNoInput card={card} onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
    case "number":
      return <NumberInput card={card} onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
    case "scramble":
      return <ScrambleInput card={card} allCards={allCards} onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
    case "mcq":
      return <McqInput card={card} allCards={allCards} onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
    case "fillblank":
      return <FillBlankInput card={card} allCards={allCards} onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
    default:
      return <TextInputMode onAnswer={handleAnswer} onShowAnswer={onShowAnswer} />;
  }
}
