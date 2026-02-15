"use client";

import { useState } from "react";
import type { DeckFromApi, CardFromApi } from "../lib/api";
import { updateDeck, addCard, updateCard, deleteCard, STORAGE_BASE } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { Header } from "./Header";
import { IconTrash, IconEdit, IconPlus } from "./Icons";

type EditDeckViewProps = {
  deck: DeckFromApi;
  initialCards: CardFromApi[];
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
};

export function EditDeckView({ deck, initialCards, onBack, userName, onLogout, onHelp, onProfile }: EditDeckViewProps) {
  useLanguage();
  const [deckName, setDeckName] = useState(deck.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [cards, setCards] = useState<CardFromApi[]>(initialCards);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswersList, setEditAnswersList] = useState<string[]>([""]);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswersList, setNewAnswersList] = useState<string[]>([""]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; question: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchCards, setSearchCards] = useState("");

  async function handleRenameDeck() {
    if (!deckName.trim() || deckName === deck.name) {
      setIsEditingName(false);
      return;
    }
    try {
      setLoading(true);
      await updateDeck(deck.id, deckName.trim());
      setIsEditingName(false);
    } catch {
      setError(t.edit.errorRename);
    } finally {
      setLoading(false);
    }
  }

  function startEditCard(card: CardFromApi) {
    setEditingCardId(card.id);
    setEditQuestion(card.question);
    setEditAnswersList(card.answers.length > 0 ? [...card.answers] : [""]);
    setEditImageUrl(card.imageUrl || "");
    setError("");
  }

  function handleEditAnswerChange(index: number, value: string) {
    setEditAnswersList(prev => prev.map((a, i) => i === index ? value : a));
  }

  function handleNewAnswerChange(index: number, value: string) {
    setNewAnswersList(prev => prev.map((a, i) => i === index ? value : a));
  }

  async function handleUpdateCard(cardId: string) {
    const question = editQuestion.trim();
    const answers = editAnswersList.map(s => s.trim()).filter(Boolean);
    const imageUrl = editImageUrl.trim() || null;
    if (!question || answers.length === 0) {
      setError(t.edit.questionRequired);
      return;
    }
    try {
      setLoading(true);
      await updateCard(deck.id, cardId, question, answers, imageUrl);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, question, answers, imageUrl } : c));
      setEditingCardId(null);
      setError("");
    } catch {
      setError(t.edit.errorUpdate);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCard() {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await deleteCard(deck.id, deleteTarget.id);
      setCards(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setError("");
    } catch {
      setError(t.edit.errorDelete);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCard() {
    const question = newQuestion.trim();
    const answers = newAnswersList.map(s => s.trim()).filter(Boolean);
    const imageUrl = newImageUrl.trim() || null;
    if (!question || answers.length === 0) {
      setError(t.edit.questionRequired);
      return;
    }
    try {
      setLoading(true);
      const card = await addCard(deck.id, question, answers, imageUrl);
      setCards(prev => [...prev, card]);
      setNewQuestion("");
      setNewAnswersList([""]);
      setNewImageUrl("");
      setError("");
    } catch {
      setError(t.edit.errorAdd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHelp={onHelp}
        onProfile={onProfile}
        title={
          isEditingName ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
              <input
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRenameDeck()}
                autoFocus
                style={{ flex: 1, fontSize: "1rem", padding: "0.25rem 0.5rem" }}
              />
              <button
                onClick={handleRenameDeck}
                disabled={loading}
                style={{ minWidth: 0, flex: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
              >
                OK
              </button>
            </div>
          ) : (
            <span
              onClick={() => setIsEditingName(true)}
              className="icon-clickable"
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
              title={t.edit.clickToRename}
            >
              {deckName} <IconEdit size={14} />
            </span>
          )
        }
        onBack={onBack}
      />

      {error && (
        <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Cards List + Add Form */}
      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Add card form */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: "8px",
            background: "var(--color-stats-bg)",
          }}>
            <input
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder={t.edit.cardQuestion}
              style={{ width: "100%" }}
            />
            {newAnswersList.map((ans, i) => (
              <input
                key={i}
                value={ans}
                onChange={e => handleNewAnswerChange(i, e.target.value)}
                placeholder={`${t.edit.cardAnswers}${newAnswersList.length > 1 ? ` ${i + 1}` : ""}`}
                onKeyDown={e => { if (e.key === "Enter") handleAddCard(); }}
                style={{ width: "100%" }}
              />
            ))}
            <input
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              placeholder={t.edit.cardImage}
              onKeyDown={e => e.key === "Enter" && handleAddCard()}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setNewAnswersList(prev => [...prev, ""])}
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", opacity: 0.7 }}
              >
                {t.create.addAltAnswer}
              </button>
              <button
                className="primary"
                onClick={handleAddCard}
                disabled={loading || !newQuestion.trim() || !newAnswersList.some(a => a.trim())}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
              >
                <IconPlus size={14} /> {t.common.add}
              </button>
            </div>
          </div>

          {/* Card count + search */}
          <div>
            <div className="small" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
              {cards.length} {t.edit.cardCount}
            </div>

            {cards.length >= 5 && (
              <input
                value={searchCards}
                onChange={e => setSearchCards(e.target.value)}
                placeholder={t.edit.searchCards}
                style={{ marginBottom: "0.25rem", width: "100%" }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {(() => {
                const q = searchCards.toLowerCase().trim();
                const filtered = q
                  ? cards.filter(c => c.question.toLowerCase().includes(q) || c.answers.some(a => a.toLowerCase().includes(q)))
                  : cards;
                return filtered.map((card) => (
                  <div key={card.id}>
                    {editingCardId === card.id ? (
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
                          placeholder={t.edit.cardQuestion}
                          autoFocus
                          style={{ width: "100%" }}
                        />
                        {editAnswersList.map((ans, ai) => (
                          <input
                            key={ai}
                            value={ans}
                            onChange={e => handleEditAnswerChange(ai, e.target.value)}
                            placeholder={`${t.edit.cardAnswers}${editAnswersList.length > 1 ? ` ${ai + 1}` : ""}`}
                            style={{ width: "100%" }}
                          />
                        ))}
                        <input
                          value={editImageUrl}
                          onChange={e => setEditImageUrl(e.target.value)}
                          placeholder={t.edit.cardImage}
                          style={{ width: "100%" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => setEditAnswersList(prev => [...prev, ""])}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", opacity: 0.7 }}
                          >
                            {t.create.addAltAnswer}
                          </button>
                          <button
                            className="primary"
                            onClick={() => handleUpdateCard(card.id)}
                            disabled={loading}
                            style={{ flex: 1 }}
                          >
                            {t.common.save}
                          </button>
                          <button
                            onClick={() => setEditingCardId(null)}
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
                        {card.imageUrl && (
                          <img
                            src={`${STORAGE_BASE}${card.imageUrl}`}
                            alt=""
                            style={{ width: "48px", height: "48px", objectFit: "contain", flexShrink: 0, borderRadius: "4px" }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.question}
                          </div>
                          <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.answers.join(", ")}
                          </div>
                        </div>
                        <span
                          onClick={() => startEditCard(card)}
                          className="action-icon"
                          title={t.common.edit}
                          style={{ padding: "0.25rem", flexShrink: 0 }}
                        >
                          <IconEdit size={14} />
                        </span>
                        <span
                          onClick={() => setDeleteTarget({ id: card.id, question: card.question })}
                          className="action-icon delete"
                          title={t.common.delete}
                          style={{ padding: "0.25rem", flexShrink: 0 }}
                        >
                          <IconTrash size={14} />
                        </span>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            {cards.length === 0 && (
              <div className="small" style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "0.5rem 0" }}>
                {t.edit.noCards}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t.edit.deleteCard}
        message={deleteTarget ? `${t.edit.confirmDelete} "${deleteTarget.question}" ?` : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={handleDeleteCard}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
