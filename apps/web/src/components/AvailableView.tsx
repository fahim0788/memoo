"use client";

import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconPlus, IconTrash, IconEdit, IconFolderPublic, IconLockPrivate, DeckIcon } from "./Icons";
import { Header } from "./Header";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type AvailableViewProps = {
  publicLists: DeckFromApi[];
  personalLists: DeckFromApi[];
  onAdd: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onEdit: (deck: DeckFromApi) => void;
  onCreateDeck: () => void;
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
};

export function AvailableView({
  publicLists,
  personalLists,
  onAdd,
  onDelete,
  onEdit,
  onCreateDeck,
  onBack,
  userName,
  onLogout,
  onHelp,
  onProfile,
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
        onHelp={onHelp}
        onProfile={onProfile}
        title={t.available.title}
        onBack={onBack}
      />

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.available.searchPlaceholder}
        style={{ marginBottom: "-0.25rem" }}
      />

      {/* Public Lists Section */}
      <div className="card">
        <div className="small" style={{ marginBottom: "0.25rem" }}>{t.available.publicLists} ({filteredPublic.length})</div>

        {filteredPublic.length === 0 && (
          <p className="small" style={{ color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
            {t.available.allPublicActivated}
          </p>
        )}

        {filteredPublic.map((deck) => (
          <div key={deck.id} className="primary card-button" style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
                {deck.icon ? (
                  <DeckIcon icon={deck.icon} size={16} />
                ) : (
                  <DeckIcon icon="star:#6b7280" size={16} />
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{deck.name}</span>
              <span
                style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", marginLeft: "10px", justifyContent: "flex-end" }}
              >
                <span
                  onClick={() => onAdd(deck.id)}
                  className="action-icon"
                  title={t.available.addButton}
                >
                  <IconPlus size={14} />
                </span>
                <span style={{ width: "1px", height: "14px", background: "var(--color-border)", opacity: 0.6 }} />
                <IconFolderPublic size={14} style={{ opacity: 0.5 }} />
              </span>
            </div>
            <div style={{ marginTop: "2px" }}>
              <span className="small" style={{ fontWeight: 400 }}>
                {deck.cardCount} {t.plural.cards(deck.cardCount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Personal Lists Section */}
      <div className="card">
        <div className="small" style={{ marginBottom: "0.25rem" }}>{t.available.personalLists} ({filteredPersonal.length})</div>

        {filteredPersonal.length === 0 && (
          <p className="small" style={{ color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
            {t.available.noPersonalLists}
          </p>
        )}

        {filteredPersonal.map((deck) => (
          <div key={deck.id} className="primary card-button" style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
                {deck.icon ? (
                  <DeckIcon icon={deck.icon} size={16} />
                ) : (
                  <DeckIcon icon="star:#6b7280" size={16} />
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{deck.name}</span>
              <span
                style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", marginLeft: "10px", justifyContent: "flex-end" }}
              >
                <span
                  onClick={() => onAdd(deck.id)}
                  className="action-icon"
                  title={t.available.addButton}
                >
                  <IconPlus size={14} />
                </span>
                <span
                  onClick={() => onEdit(deck)}
                  className="action-icon"
                  title={t.common.edit}
                >
                  <IconEdit size={14} />
                </span>
                <span
                  onClick={() => setDeleteTarget({ id: deck.id, name: deck.name })}
                  className="action-icon delete"
                  title={t.common.delete}
                >
                  <IconTrash size={14} />
                </span>
                <span style={{ width: "1px", height: "14px", background: "var(--color-border)", opacity: 0.6 }} />
                <IconLockPrivate size={14} style={{ opacity: 0.5 }} />
              </span>
            </div>
            <div style={{ marginTop: "2px" }}>
              <span className="small" style={{ fontWeight: 400 }}>
                {deck.cardCount} {t.plural.cards(deck.cardCount)}
              </span>
            </div>
          </div>
        ))}

        <button onClick={onCreateDeck} className="primary" style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}>
          <IconPlus size={16} />
          {t.available.createPersonal}
        </button>
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
