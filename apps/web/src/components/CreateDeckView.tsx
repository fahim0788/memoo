"use client";

import { useState, useRef } from "react";
import { IconAlert } from "./Icons";
import { Header } from "./Header";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type Card = {
  question: string;
  answers: string[];
};

type CreateDeckViewProps = {
  onBack: () => void;
  onCreated: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
};

function parseJSON(text: string): { name: string; cards: Card[] } | null {
  try {
    const data = JSON.parse(text);
    if (!data.name || !Array.isArray(data.cards)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function parseCSV(text: string): Card[] | null {
  try {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return null; // Need header + at least one card

    const header = lines[0].toLowerCase();

    // Check if first column is "question"
    if (!header.startsWith('question')) return null;

    const cards: Card[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Split by comma, but respect quoted fields
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length < 2) continue; // Need at least question and one answer

      const question = parts[0];
      const answers = parts.slice(1).filter(a => a.length > 0);

      if (question && answers.length > 0) {
        cards.push({ question, answers });
      }
    }

    return cards.length > 0 ? cards : null;
  } catch {
    return null;
  }
}

export function CreateDeckView({ onBack, onCreated, userName, onLogout, onHelp, onProfile }: CreateDeckViewProps) {
  useLanguage();
  const [name, setName] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError(t.create.nameRequiredError);
      return;
    }

    if (!jsonText.trim()) {
      setError(t.create.jsonRequiredError);
      return;
    }

    // Try parsing as JSON first
    const parsed = parseJSON(jsonText);
    if (!parsed) {
      setError(t.create.jsonInvalidError);
      return;
    }

    if (parsed.cards.length === 0) {
      setError(t.create.minOneCardError);
      return;
    }

    // Validate cards
    for (const card of parsed.cards) {
      if (!card.question || !Array.isArray(card.answers) || card.answers.length === 0) {
        setError(t.create.cardFormatError);
        return;
      }
    }

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/my-decks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: parsed.name || name.trim(),
          cards: parsed.cards,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.create.errorCreate);
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || t.create.networkError);
    } finally {
      setLoading(false);
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'json') {
        // Validate JSON
        const parsed = parseJSON(text);
        if (parsed) {
          setJsonText(text);
          if (!name.trim() && parsed.name) {
            setName(parsed.name);
          }
          setError(null);
        } else {
          setError(t.create.formatInvalid);
        }
      } else if (ext === 'csv') {
        // Parse CSV and convert to JSON format
        const cards = parseCSV(text);
        if (cards) {
          const jsonData = {
            name: name.trim() || file.name.replace(/\.[^/.]+$/, ""),
            cards,
          };
          setJsonText(JSON.stringify(jsonData, null, 2));
          if (!name.trim()) {
            setName(jsonData.name);
          }
          setError(null);
        } else {
          setError(t.create.csvInvalid);
        }
      } else {
        setError(t.create.formatUnsupported);
      }
    };

    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  }

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHelp={onHelp}
        onProfile={onProfile}
        title={t.create.title}
        onBack={onBack}
      />

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="deck-name" className="small" style={{ display: "block", marginBottom: "0.25rem" }}>
              {t.create.deckName}
            </label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.create.namePlaceholder}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label htmlFor="deck-json" className="small" style={{ display: "block", marginBottom: "0.25rem" }}>
              {t.create.jsonContent}
            </label>
            <textarea
              id="deck-json"
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='{"name": "Ma liste", "cards": [{"question": "Q1?", "answers": ["R1", "R2"]}]}'
              rows={10}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.875rem" }}
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileImport}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "100%" }}
            >
              📁 {t.create.noteText}
            </button>
          </div>

          {error && (
            <div style={{ color: "#c43a31", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconAlert size={16} style={{ color: "#c43a31" }} />
              {error}
            </div>
          )}

          <button
            className="primary"
            onClick={handleCreate}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? t.create.creating : t.create.create}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="small" style={{ color: "#666" }}>
          <h3 style={{ marginTop: 0 }}>{t.create.formatTitle}</h3>
          <p>{t.create.formatDesc}</p>

          <h4 style={{ marginTop: "1rem" }}>{t.create.exampleTitle} JSON:</h4>
          <pre style={{ background: "#f5f5f5", padding: "0.5rem", borderRadius: "4px", overflow: "auto" }}>
{t.create.exampleJson}
          </pre>

          <h4 style={{ marginTop: "1rem" }}>{t.create.exampleTitle} CSV:</h4>
          <pre style={{ background: "#f5f5f5", padding: "0.5rem", borderRadius: "4px", overflow: "auto" }}>
{t.create.exampleCsv}
          </pre>

          <p style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            <strong>{t.create.noteTitle}:</strong> {t.create.noteText}
          </p>
        </div>
      </div>
    </>
  );
}
