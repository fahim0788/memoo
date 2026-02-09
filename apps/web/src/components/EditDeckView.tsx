"use client";

import { useState } from "react";
import type { DeckFromApi, CardFromApi } from "../lib/api";
import { updateDeck, addCard, updateCard, deleteCard, STORAGE_BASE } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { Header } from "./Header";
import { IconTrash, IconEdit } from "./Icons";

type EditDeckViewProps = {
  deck: DeckFromApi;
  initialCards: CardFromApi[];
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHome?: () => void;
};

export function EditDeckView({ deck, initialCards, onBack, userName, onLogout, onHome }: EditDeckViewProps) {
  useLanguage();
  const [deckName, setDeckName] = useState(deck.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [cards, setCards] = useState<CardFromApi[]>(initialCards);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswers, setEditAnswers] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswers, setNewAnswers] = useState("");
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
    setEditAnswers(card.answers.join(", "));
    setEditImageUrl(card.imageUrl || "");
    setError("");
  }

  async function handleUpdateCard(cardId: string) {
    const question = editQuestion.trim();
    const answers = editAnswers.split(",").map(a => a.trim()).filter(Boolean);
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
    const answers = newAnswers.split(",").map(a => a.trim()).filter(Boolean);
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
      setNewAnswers("");
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
        onHome={onHome}
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
        secondaryActions={
          <button
            onClick={onBack}
            style={{ minWidth: 0, flex: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            {t.common.back}
          </button>
        }
      />

      {error && (
        <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Cards List */}
      <div className="card">
        <div className="small">{cards.length} {t.edit.cardCount}</div>

        {cards.length >= 5 && (
          <input
            value={searchCards}
            onChange={e => setSearchCards(e.target.value)}
            placeholder={t.edit.searchCards}
            style={{ marginBottom: "0.25rem" }}
          />
        )}

        {(() => {
          const q = searchCards.toLowerCase().trim();
          const filtered = q
            ? cards.filter(c => c.question.toLowerCase().includes(q) || c.answers.some(a => a.toLowerCase().includes(q)))
            : cards;
          return filtered.map((card, i) => (
          <div key={card.id}>
            {i > 0 && <div style={{ borderTop: "1px solid var(--color-border)", margin: "0.25rem 0" }} />}

            {editingCardId === card.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem 0" }}>
                <input
                  value={editQuestion}
                  onChange={e => setEditQuestion(e.target.value)}
                  placeholder={t.edit.cardQuestion}
                  autoFocus
                />
                <input
                  value={editAnswers}
                  onChange={e => setEditAnswers(e.target.value)}
                  placeholder={t.edit.cardAnswers}
                />
                <input
                  value={editImageUrl}
                  onChange={e => setEditImageUrl(e.target.value)}
                  placeholder={t.edit.cardImage}
                />
                <div style={{ display: "flex", gap: "8px" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0.5rem 0" }}>
                {card.imageUrl && (
                  <img
                    src={`${STORAGE_BASE}${card.imageUrl}`}
                    alt=""
                    style={{ width: "48px", height: "48px", objectFit: "contain", flexShrink: 0, border: "1px solid rgba(255, 255, 255, 0.1)" }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{card.question}</div>
                  <div className="small">{card.answers.join(", ")}</div>
                </div>
                <button
                  onClick={() => startEditCard(card)}
                  style={{ minWidth: 0, flex: "none", width: "36px", padding: "8px" }}
                  title={t.common.edit}
                >
                  <IconEdit size={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: card.id, question: card.question })}
                  style={{
                    minWidth: 0,
                    flex: "none",
                    width: "36px",
                    padding: "8px",
                    background: "var(--color-error-light)",
                    borderColor: "var(--color-error-border)",
                  }}
                  title={t.common.delete}
                >
                  <IconTrash size={16} />
                </button>
              </div>
            )}
          </div>
          ));
        })()}

        {cards.length === 0 && (
          <p className="small" style={{ textAlign: "center" }}>{t.edit.noCards}</p>
        )}
      </div>

      {/* Add Card Form */}
      <div className="card">
        <div className="small">{t.edit.addCard}</div>
        <input
          value={newQuestion}
          onChange={e => setNewQuestion(e.target.value)}
          placeholder={t.edit.cardQuestion}
        />
        <input
          value={newAnswers}
          onChange={e => setNewAnswers(e.target.value)}
          placeholder={t.edit.cardAnswers}
        />
        <input
          value={newImageUrl}
          onChange={e => setNewImageUrl(e.target.value)}
          placeholder={t.edit.cardImage}
          onKeyDown={e => e.key === "Enter" && handleAddCard()}
        />
        <button
          className="primary"
          onClick={handleAddCard}
          disabled={loading || !newQuestion.trim() || !newAnswers.trim()}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {t.common.add}
        </button>
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
