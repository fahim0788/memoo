"use client";

import { useState, useRef } from "react";
import { IconAlert, IconPlus, IconTrash, IconEdit } from "./Icons";
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
    if (lines.length < 2) return null;

    const header = lines[0].toLowerCase();
    if (!header.startsWith('question')) return null;

    const cards: Card[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 2) continue;

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
  const [cards, setCards] = useState<Card[]>([]);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  function handleAddCard() {
    setError(null);
    const q = question.trim();
    const a = answers.map(s => s.trim()).filter(s => s.length > 0);

    if (!q) {
      setError(t.create.questionRequired);
      return;
    }
    if (a.length === 0) {
      setError(t.create.answerRequired);
      return;
    }

    setCards(prev => [...prev, { question: q, answers: a }]);
    setQuestion("");
    setAnswers([""]);
    questionRef.current?.focus();
  }

  function handleRemoveCard(index: number) {
    setCards(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
  }

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswersList, setEditAnswersList] = useState<string[]>([""]);

  function startEditCard(index: number) {
    setEditingIndex(index);
    setEditQuestion(cards[index].question);
    setEditAnswersList(cards[index].answers.length > 0 ? [...cards[index].answers] : [""]);
  }

  function handleEditAnswerChange(index: number, value: string) {
    setEditAnswersList(prev => prev.map((a, i) => i === index ? value : a));
  }

  function handleSaveEdit() {
    if (editingIndex === null) return;
    const q = editQuestion.trim();
    const a = editAnswersList.map(s => s.trim()).filter(s => s.length > 0);
    if (!q || a.length === 0) return;
    setCards(prev => prev.map((c, i) => i === editingIndex ? { question: q, answers: a } : c));
    setEditingIndex(null);
  }

  function handleAddAltAnswer() {
    setAnswers(prev => [...prev, ""]);
  }

  function handleAnswerChange(index: number, value: string) {
    setAnswers(prev => prev.map((a, i) => i === index ? value : a));
  }

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError(t.create.nameRequiredError);
      return;
    }

    if (cards.length === 0) {
      setError(t.create.minOneCardError);
      return;
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
        body: JSON.stringify({ name: name.trim(), cards }),
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

  function handleImportJSON() {
    setError(null);
    const parsed = parseJSON(jsonText);
    if (!parsed) {
      setError(t.create.jsonInvalidError);
      return;
    }
    if (parsed.cards.length === 0) {
      setError(t.create.minOneCardError);
      return;
    }
    for (const card of parsed.cards) {
      if (!card.question || !Array.isArray(card.answers) || card.answers.length === 0) {
        setError(t.create.cardFormatError);
        return;
      }
    }
    setCards(prev => [...prev, ...parsed.cards]);
    if (!name.trim() && parsed.name) setName(parsed.name);
    setJsonText("");
    setShowAdvanced(false);
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
        const parsed = parseJSON(text);
        if (parsed) {
          setCards(prev => [...prev, ...parsed.cards]);
          if (!name.trim() && parsed.name) setName(parsed.name);
          setError(null);
          setShowAdvanced(false);
        } else {
          setError(t.create.formatInvalid);
        }
      } else if (ext === 'csv') {
        const csvCards = parseCSV(text);
        if (csvCards) {
          setCards(prev => [...prev, ...csvCards]);
          if (!name.trim()) setName(file.name.replace(/\.[^/.]+$/, ""));
          setError(null);
          setShowAdvanced(false);
        } else {
          setError(t.create.csvInvalid);
        }
      } else {
        setError(t.create.formatUnsupported);
      }
    };

    reader.readAsText(file);
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

      {/* Nom de la liste */}
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

          {/* Formulaire ajout carte */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: "8px",
            background: "var(--color-stats-bg)",
          }}>
            <input
              ref={questionRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t.create.questionLabel}
              onKeyDown={e => { if (e.key === "Enter" && answers[0]) handleAddCard(); }}
              style={{ width: "100%" }}
            />
            {answers.map((ans, i) => (
              <input
                key={i}
                type="text"
                value={ans}
                onChange={e => handleAnswerChange(i, e.target.value)}
                placeholder={`${t.create.answerLabel}${answers.length > 1 ? ` ${i + 1}` : ""}`}
                onKeyDown={e => { if (e.key === "Enter") handleAddCard(); }}
                style={{ width: "100%" }}
              />
            ))}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleAddAltAnswer}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", opacity: 0.7 }}
              >
                {t.create.addAltAnswer}
              </button>
              <button
                onClick={handleAddCard}
                className="primary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
              >
                <IconPlus size={14} /> {t.create.addCard}
              </button>
            </div>
          </div>

          {/* Liste des cartes ajoutées */}
          {cards.length > 0 && (
            <div>
              <div className="small" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                {t.create.cardsCount(cards.length)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {cards.map((card, i) => (
                  <div key={i}>
                    {editingIndex === i ? (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        background: "var(--color-stats-bg)",
                      }}>
                        <input
                          value={editQuestion}
                          onChange={e => setEditQuestion(e.target.value)}
                          placeholder={t.create.questionLabel}
                          autoFocus
                          style={{ width: "100%" }}
                        />
                        {editAnswersList.map((ans, ai) => (
                          <input
                            key={ai}
                            value={ans}
                            onChange={e => handleEditAnswerChange(ai, e.target.value)}
                            placeholder={`${t.create.answerLabel}${editAnswersList.length > 1 ? ` ${ai + 1}` : ""}`}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); }}
                            style={{ width: "100%" }}
                          />
                        ))}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => setEditAnswersList(prev => [...prev, ""])}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", opacity: 0.7 }}
                          >
                            {t.create.addAltAnswer}
                          </button>
                          <button
                            className="primary"
                            onClick={handleSaveEdit}
                            style={{ flex: 1 }}
                          >
                            {t.common.save}
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            style={{ flex: 1 }}
                          >
                            {t.common.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.4rem 0.5rem",
                        borderRadius: "6px",
                        background: "var(--color-bg-secondary)",
                        fontSize: "0.85rem",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.question}
                          </div>
                          <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.answers.join(", ")}
                          </div>
                        </div>
                        <span
                          onClick={() => startEditCard(i)}
                          className="action-icon"
                          title={t.common.edit}
                          style={{ padding: "0.25rem", flexShrink: 0 }}
                        >
                          <IconEdit size={14} />
                        </span>
                        <span
                          onClick={() => handleRemoveCard(i)}
                          className="action-icon delete"
                          title={t.create.removeCard}
                          style={{ padding: "0.25rem", flexShrink: 0 }}
                        >
                          <IconTrash size={14} />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cards.length === 0 && (
            <div className="small" style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "0.5rem 0" }}>
              {t.create.noCardsYet}
            </div>
          )}

          {error && (
            <div style={{ color: "#c43a31", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconAlert size={16} style={{ color: "#c43a31" }} />
              {error}
            </div>
          )}

          <button
            className="primary"
            onClick={handleCreate}
            disabled={loading || cards.length === 0}
            style={{ width: "100%" }}
          >
            {loading ? t.create.creating : cards.length > 0 ? t.create.createWithCount(cards.length) : t.create.create}
          </button>
        </div>
      </div>

      {/* Mode avancé replié */}
      <div className="card" style={{ marginTop: "0.5rem" }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            padding: "0.25rem 0",
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {showAdvanced ? "▾" : "▸"} {t.create.advancedImport}
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div>
              <label htmlFor="deck-json" className="small" style={{ display: "block", marginBottom: "0.25rem" }}>
                {t.create.jsonContent}
              </label>
              <textarea
                id="deck-json"
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder='{"name": "Ma liste", "cards": [{"question": "Q1?", "answers": ["R1", "R2"]}]}'
                rows={8}
                style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileImport}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: 1 }}
              >
                {t.create.noteText}
              </button>
              <button
                className="primary"
                onClick={handleImportJSON}
                disabled={!jsonText.trim()}
                style={{ flex: 1 }}
              >
                {t.create.addCard}
              </button>
            </div>

            <div className="small" style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
              <p style={{ margin: "0 0 0.5rem" }}>{t.create.formatDesc}</p>
              <pre style={{ background: "var(--color-stats-bg)", padding: "0.5rem", borderRadius: "4px", overflow: "auto", margin: "0 0 0.5rem" }}>
{t.create.exampleJson}
              </pre>
              <pre style={{ background: "var(--color-stats-bg)", padding: "0.5rem", borderRadius: "4px", overflow: "auto", margin: 0 }}>
{t.create.exampleCsv}
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
