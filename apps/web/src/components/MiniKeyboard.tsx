"use client";

import { useState, useCallback, useRef } from "react";
import { getCurrentLanguage } from "../lib/i18n";
import { t } from "../lib/i18n";

// ─── Layouts ─────────────────────────────────────────────────

const AZERTY = [
  ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
  ["w", "x", "c", "v", "b", "n"],
];

const QWERTY = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const NUMBERS_SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["@", "#", "€", "%", "&", "*", "(", ")", "+", "="],
  ["!", "?", ":", "/", "\"", "_"],
];

// ─── Accent map (long-press) ─────────────────────────────────

const ACCENTS: Record<string, string[]> = {
  a: ["à", "â", "æ", "ä"],
  e: ["é", "è", "ê", "ë"],
  i: ["î", "ï"],
  o: ["ô", "œ", "ö"],
  u: ["ù", "û", "ü"],
  c: ["ç"],
  y: ["ÿ"],
};

const LONG_PRESS_MS = 400;

// ─── Component ───────────────────────────────────────────────

type MiniKeyboardProps = {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
};

export function MiniKeyboard({ onChar, onBackspace, onSubmit }: MiniKeyboardProps) {
  const [shifted, setShifted] = useState(false);
  const [numMode, setNumMode] = useState(false);
  const [accentPopup, setAccentPopup] = useState<{ key: string; accents: string[]; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const isFr = getCurrentLanguage() === "fr";
  const layout = isFr ? AZERTY : QWERTY;

  const emit = useCallback(
    (key: string) => {
      onChar(shifted ? key.toUpperCase() : key);
      if (shifted) setShifted(false);
    },
    [shifted, onChar],
  );

  // Long-press handling for accents
  const handlePointerDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      e.preventDefault();
      didLongPress.current = false;
      const lower = key.toLowerCase();
      const accents = ACCENTS[lower];

      if (accents) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          setAccentPopup({
            key: lower,
            accents,
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        }, LONG_PRESS_MS);
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (key: string, e: React.PointerEvent) => {
      e.preventDefault();
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      // If we didn't trigger long-press, emit the regular key
      if (!didLongPress.current && !accentPopup) {
        emit(key);
      }
    },
    [emit, accentPopup],
  );

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleAccentPick = useCallback(
    (accent: string) => {
      onChar(shifted ? accent.toUpperCase() : accent);
      if (shifted) setShifted(false);
      setAccentPopup(null);
    },
    [shifted, onChar],
  );

  const rows = numMode ? NUMBERS_SYMBOLS : layout;

  return (
    <div className="mini-kb" onPointerLeave={handlePointerCancel}>
      {/* Accent popup overlay */}
      {accentPopup && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
          }}
          onPointerDown={(e) => { e.preventDefault(); setAccentPopup(null); }}
        >
          <div
            style={{
              position: "absolute",
              left: accentPopup.x,
              top: accentPopup.y - 8,
              transform: "translate(-50%, -100%)",
              display: "flex",
              gap: "2px",
              background: "var(--color-bg)",
              border: "2px solid var(--color-primary)",
              borderRadius: "10px",
              padding: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              zIndex: 101,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {accentPopup.accents.map((a) => (
              <button
                key={a}
                type="button"
                className="mini-kb-key"
                style={{ minWidth: "2.2rem", fontSize: "1.1rem", fontWeight: 700 }}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAccentPick(a); }}
              >
                {shifted ? a.toUpperCase() : a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 */}
      <div className="mini-kb-row">
        {rows[0].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => numMode ? (e.preventDefault(), onChar(k)) : handlePointerDown(k, e)}
            onPointerUp={(e) => numMode ? undefined : handlePointerUp(k, e)}
            onPointerCancel={handlePointerCancel}
          >
            {!numMode && shifted ? k.toUpperCase() : k}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="mini-kb-row">
        {rows[1].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => numMode ? (e.preventDefault(), onChar(k)) : handlePointerDown(k, e)}
            onPointerUp={(e) => numMode ? undefined : handlePointerUp(k, e)}
            onPointerCancel={handlePointerCancel}
          >
            {!numMode && shifted ? k.toUpperCase() : k}
          </button>
        ))}
      </div>

      {/* Row 3: Shift/special + letters + Backspace */}
      <div className="mini-kb-row">
        {numMode ? (
          /* In num mode: no shift, just a spacer */
          <span style={{ flex: 1.5 }} />
        ) : (
          <button
            type="button"
            className={`mini-kb-key mini-kb-key-wide ${shifted ? "mini-kb-key-active" : ""}`}
            onPointerDown={(e) => { e.preventDefault(); setShifted((s) => !s); }}
          >
            ⇧
          </button>
        )}
        {rows[2].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => numMode ? (e.preventDefault(), onChar(k)) : handlePointerDown(k, e)}
            onPointerUp={(e) => numMode ? undefined : handlePointerUp(k, e)}
            onPointerCancel={handlePointerCancel}
          >
            {!numMode && shifted ? k.toUpperCase() : k}
          </button>
        ))}
        <button
          type="button"
          className="mini-kb-key mini-kb-key-wide"
          onPointerDown={(e) => { e.preventDefault(); onBackspace(); }}
        >
          ⌫
        </button>
      </div>

      {/* Row 4: 123/abc + left punct + space + right punct + submit */}
      <div className="mini-kb-row">
        <button
          type="button"
          className={`mini-kb-key mini-kb-key-wide ${numMode ? "mini-kb-key-active" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); setNumMode((m) => !m); }}
          style={{ fontSize: "0.8rem", fontWeight: 700 }}
        >
          {numMode ? "abc" : "123"}
        </button>
        {(isFr ? ["'", "-"] : [",", "'"]).map((ch) => (
          <button
            key={ch}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => { e.preventDefault(); emit(ch); }}
          >
            {ch}
          </button>
        ))}
        <button
          type="button"
          className="mini-kb-key mini-kb-key-space"
          onPointerDown={(e) => { e.preventDefault(); emit(" "); }}
        >
          {isFr ? "espace" : "space"}
        </button>
        {(isFr ? [".", ","] : [".", "-"]).map((ch) => (
          <button
            key={ch}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => { e.preventDefault(); emit(ch); }}
          >
            {ch}
          </button>
        ))}
        <button
          type="button"
          className="mini-kb-key mini-kb-key-submit"
          onPointerDown={(e) => { e.preventDefault(); onSubmit(); }}
        >
          {t.study.validate}
        </button>
      </div>
    </div>
  );
}
