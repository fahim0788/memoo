"use client";

import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { extractEmoji } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconPlus, IconTrash, IconFolderPublic, IconUser } from "./Icons";
import { Header } from "./Header";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type AvailableViewProps = {
  publicLists: DeckFromApi[];
  personalLists: DeckFromApi[];
  onAdd: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onCreateDeck: () => void;
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHome?: () => void;
};

export function AvailableView({
  publicLists,
  personalLists,
  onAdd,
  onDelete,
  onCreateDeck,
  onBack,
  userName,
  onLogout,
  onHome,
}: AvailableViewProps) {
  useLanguage();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();
  const filteredPublic = q ? publicLists.filter(d => d.name.toLowerCase().includes(q)) : publicLists;
  const filteredPersonal = q ? personalLists.filter(d => d.name.toLowerCase().includes(q)) : personalLists;

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHome={onHome}
        title={t.available.title}
        secondaryActions={
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none", minWidth: "auto" }}>
            {t.common.back}
          </button>
        }
      />

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.available.searchPlaceholder}
        style={{ marginBottom: "-0.25rem" }}
      />

      {/* Public Lists Section */}
      <div className="card" style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div className="small" style={{ fontWeight: 700 }}>
            {t.available.publicLists} ({filteredPublic.length})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: "#999", textTransform: "lowercase", fontWeight: 500 }}>
            <IconFolderPublic size={12} />
            public
          </div>
        </div>

        {filteredPublic.length === 0 && (
          <p className="small" style={{ color: "#666", marginTop: "0.5rem" }}>
            {t.available.allPublicActivated}
          </p>
        )}

        {filteredPublic.map(deck => {
          const { emoji, name } = extractEmoji(deck.name);
          return (
            <div
              key={deck.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                padding: "0.75rem 0",
                borderTop: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                {emoji && <span style={{ fontSize: "1.2rem" }}>{emoji}</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div className="small" style={{ color: "#666" }}>
                    {deck.cardCount} {t.plural.cards(deck.cardCount)}
                  </div>
                </div>
              </div>
              <button
                className="primary"
                onClick={() => onAdd(deck.id)}
                style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
              >
                {t.available.addButton}
              </button>
            </div>
          );
        })}
      </div>

      {/* Personal Lists Section */}
      <div className="card">
        <div className="small" style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <IconUser size={16} />
          {t.available.personalLists} ({filteredPersonal.length})
        </div>

        <button onClick={onCreateDeck} className="primary" style={{ margin: "0.5rem 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <IconPlus size={16} />
          {t.available.createPersonal}
        </button>

        {filteredPersonal.length === 0 && (
          <p className="small" style={{ color: "#666", marginTop: "0.5rem" }}>
            {t.available.noPersonalLists}
          </p>
        )}

        {filteredPersonal.map(deck => (
          <div
            key={deck.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 0",
              borderTop: "none",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{deck.name}</div>
              <div className="small" style={{ color: "#666" }}>
                {deck.cardCount} {t.plural.cards(deck.cardCount)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="primary"
                onClick={() => onAdd(deck.id)}
                style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
              >
                {t.available.addButton}
              </button>
              <button
                onClick={() => setDeleteTarget({ id: deck.id, name: deck.name })}
                style={{
                  flex: "none",
                  minWidth: 0,
                  padding: "8px 12px",
                  background: "#fee",
                  color: "#c00",
                  border: "none",
                }}
                title={t.common.delete}
              >
                <IconTrash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t.available.confirmDelete}
        message={t.available.confirmDeleteMessage.replace('cette liste', `"${deleteTarget?.name}"`)}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
