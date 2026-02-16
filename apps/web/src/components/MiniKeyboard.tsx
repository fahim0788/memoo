"use client";

import { useState, useCallback } from "react";
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

// ─── Component ───────────────────────────────────────────────

type MiniKeyboardProps = {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
};

export function MiniKeyboard({ onChar, onBackspace, onSubmit }: MiniKeyboardProps) {
  const [shifted, setShifted] = useState(false);
  const layout = getCurrentLanguage() === "fr" ? AZERTY : QWERTY;

  const handleKey = useCallback(
    (key: string) => {
      onChar(shifted ? key.toUpperCase() : key);
      if (shifted) setShifted(false);
    },
    [shifted, onChar],
  );

  return (
    <div className="mini-kb">
      {/* Row 1 */}
      <div className="mini-kb-row">
        {layout[0].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => { e.preventDefault(); handleKey(k); }}
          >
            {shifted ? k.toUpperCase() : k}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="mini-kb-row">
        {layout[1].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => { e.preventDefault(); handleKey(k); }}
          >
            {shifted ? k.toUpperCase() : k}
          </button>
        ))}
      </div>

      {/* Row 3: Shift + letters + Backspace */}
      <div className="mini-kb-row">
        <button
          type="button"
          className={`mini-kb-key mini-kb-key-wide ${shifted ? "mini-kb-key-active" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); setShifted((s) => !s); }}
        >
          ⇧
        </button>
        {layout[2].map((k) => (
          <button
            key={k}
            type="button"
            className="mini-kb-key"
            onPointerDown={(e) => { e.preventDefault(); handleKey(k); }}
          >
            {shifted ? k.toUpperCase() : k}
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

      {/* Row 4: apostrophe + space + hyphen + submit */}
      <div className="mini-kb-row">
        <button
          type="button"
          className="mini-kb-key"
          onPointerDown={(e) => { e.preventDefault(); handleKey("'"); }}
        >
          &apos;
        </button>
        <button
          type="button"
          className="mini-kb-key mini-kb-key-space"
          onPointerDown={(e) => { e.preventDefault(); handleKey(" "); }}
        >
          espace
        </button>
        <button
          type="button"
          className="mini-kb-key"
          onPointerDown={(e) => { e.preventDefault(); handleKey("-"); }}
        >
          -
        </button>
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
