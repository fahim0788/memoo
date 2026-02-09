"use client";

import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { Header } from "./Header";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatsCard } from "./StatsCard";
import type { Stats } from "../hooks/useStats";
import { IconFolderPublic, IconUser, IconEdit, IconTrash, IconArrowUp, IconArrowDown } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type MenuViewProps = {
  myLists: DeckFromApi[];
  userName: string;
  onStudy: (deck: DeckFromApi) => void;
  onEdit: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onRemove: (deckId: string) => void;
  onReorder: (deckIds: string[]) => void;
  onLogout: () => void;
  stats: Stats | null;
};

export function MenuView({
  myLists,
  userName,
  onStudy,
  onEdit,
  onExplore,
  onRemove,
  onReorder,
  onLogout,
  stats,
}: MenuViewProps) {
  useLanguage();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [animating, setAnimating] = useState<string | null>(null);

  const q = search.toLowerCase().trim();
  const filteredLists = q ? myLists.filter(d => d.name.toLowerCase().includes(q)) : myLists;

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...myLists];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setAnimating(myLists[index].id);
    setTimeout(() => setAnimating(null), 300);
    onReorder(newOrder.map(d => d.id));
  }

  function handleMoveDown(index: number) {
    if (index === myLists.length - 1) return;
    const newOrder = [...myLists];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setAnimating(myLists[index].id);
    setTimeout(() => setAnimating(null), 300);
    onReorder(newOrder.map(d => d.id));
  }

  return (
    <>
      <Header userName={userName} onLogout={onLogout} />

      {stats && <StatsCard stats={stats} />}

      {myLists.length > 0 && (
        <div className="card">
          <div className="small">{t.menu.myLists}</div>
          {myLists.length >= 3 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.menuView.searchPlaceholder}
              style={{ marginBottom: "0.25rem" }}
            />
          )}
          {filteredLists.map((deck, index) => {
            const originalIndex = myLists.findIndex(d => d.id === deck.id);
            const isAnimating = animating === deck.id;
            return (
              <button
                key={deck.id}
                className="primary card-button"
                style={{
                  position: "relative",
                  flex: 1,
                  transition: isAnimating ? "transform 0.3s ease-in-out" : "none",
                  transform: isAnimating ? "scale(1.02)" : "scale(1)",
                }}
                onClick={() => onStudy(deck)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* Reorder buttons (only show in non-filtered view) */}
                  {!q && myLists.length > 1 && (
                    <span
                      style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "none" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span
                        onClick={() => handleMoveUp(originalIndex)}
                        className="reorder-btn"
                        style={{
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          opacity: originalIndex === 0 ? 0.3 : 1,
                        }}
                        title={t.menuView.moveUp}
                      >
                        <IconArrowUp size={12} />
                      </span>
                      <span
                        onClick={() => handleMoveDown(originalIndex)}
                        className="reorder-btn"
                        style={{
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          opacity: originalIndex === myLists.length - 1 ? 0.3 : 1,
                        }}
                        title={t.menuView.moveDown}
                      >
                        <IconArrowDown size={12} />
                      </span>
                    </span>
                  )}

                  {deck.isOwned ? (
                    <IconUser size={16} style={{ flexShrink: 0 }} />
                  ) : (
                    <IconFolderPublic size={16} style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, textAlign: "left" }}>{deck.name}</span>
                  <span
                    style={{ display: "flex", gap: "4px", flex: "none", alignItems: "center" }}
                    onClick={e => e.stopPropagation()}
                  >
                    {deck.isOwned && (
                      <span
                        onClick={() => onEdit(deck)}
                        className="action-icon"
                        title={t.common.edit}
                      >
                        <IconEdit size={14} />
                      </span>
                    )}
                    <span
                      onClick={() => setRemoveTarget({ id: deck.id, name: deck.name })}
                      className="action-icon delete"
                      title={t.common.remove}
                    >
                      <IconTrash size={14} />
                    </span>
                  </span>
                </div>
                <span className="small" style={{ display: "block", fontWeight: 400, marginTop: "2px" }}>
                  {deck.cardCount} {t.plural.cards(deck.cardCount)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {myLists.length === 0 && (
        <div className="card">
          <p className="small">{t.menuView.noDecksCta}</p>
        </div>
      )}

      <div className="card">
        <button onClick={onExplore} style={{ margin: 0 }}>
          {t.menuView.exploreAvailable}
        </button>
      </div>

      <ConfirmDialog
        isOpen={removeTarget !== null}
        title={t.menuView.removeList}
        message={t.menuView.removeConfirmMessage.replace("{name}", removeTarget?.name ?? "")}
        confirmLabel={t.menuView.removeButton}
        cancelLabel={t.common.cancel}
        variant="warning"
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
