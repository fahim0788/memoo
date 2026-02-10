"use client";

import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { Header } from "./Header";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatsCard } from "./StatsCard";
import type { Stats } from "../hooks/useStats";
import { IconFolderPublic, IconUser, IconEdit, IconTrash, IconArrowUp, IconArrowDown, DeckIcon, DECK_ICONS, DECK_COLORS } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { getStartedChapters } from "../lib/chapter-progress";

type MenuViewProps = {
  myLists: DeckFromApi[];
  userName: string;
  onStudy: (deck: DeckFromApi) => void;
  onEdit: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onRemove: (deckId: string) => void;
  onReorder: (deckIds: string[]) => void;
  onChangeIcon: (deckId: string, icon: string) => void;
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
  onChangeIcon,
  onLogout,
  stats,
}: MenuViewProps) {
  useLanguage();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [animating, setAnimating] = useState<string | null>(null);
  const [iconPicker, setIconPicker] = useState<string | null>(null);

  const q = search.toLowerCase().trim();
  const filteredLists = q ? myLists.filter(d => d.name.toLowerCase().includes(q)) : myLists;

  // Compute fixed grid area width based on the widest chapter grid across all decks
  const maxCols = Math.max(0, ...myLists.filter(d => (d.chapterCount ?? 0) > 0).map(d => Math.ceil(Math.sqrt(d.chapterCount!))));
  const gridAreaWidth = maxCols > 0 ? maxCols * 7 + (maxCols - 1) * 2 : 0;

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
              <div key={deck.id} style={{ position: "relative", width: "100%" }}>
                <button
                  className="primary card-button"
                  style={{
                    position: "relative",
                    width: "100%",
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

                    <span
                      onClick={e => { e.stopPropagation(); setIconPicker(iconPicker === deck.id ? null : deck.id); }}
                      style={{ display: "flex", alignItems: "center", cursor: "pointer", flex: "none" }}
                      title="Changer l'icône"
                    >
                      {deck.icon ? (
                        <DeckIcon icon={deck.icon} size={16} />
                      ) : (
                        <DeckIcon icon="star:#6b7280" size={16} />
                      )}
                    </span>
                    {deck.isOwned ? (
                      <IconUser size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                    ) : (
                      <IconFolderPublic size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                    )}
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deck.name}</span>
                    {gridAreaWidth > 0 && (
                      <span style={{ width: gridAreaWidth + "px", flexShrink: 0, display: "flex", justifyContent: "flex-start", marginLeft: "6px" }}>
                        {(deck.chapterCount ?? 0) > 0 && (() => {
                          const started = getStartedChapters(deck.id);
                          const total = deck.chapterCount!;
                          const cols = Math.ceil(Math.sqrt(total));
                          return (
                            <span style={{
                              display: "grid",
                              gridTemplateColumns: `repeat(${cols}, 7px)`,
                              gap: "2px",
                            }}>
                              {Array.from({ length: total }, (_, i) => (
                                <span
                                  key={i}
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "1px",
                                    background: i < started.length
                                      ? "#a3e635"
                                      : "var(--color-chapter-empty)",
                                  }}
                                />
                              ))}
                            </span>
                          );
                        })()}
                      </span>
                    )}
                    <span
                      style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", marginLeft: "10px", width: "50px", justifyContent: "flex-end" }}
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
                  <div style={{ marginTop: "2px" }}>
                    <span className="small" style={{ fontWeight: 400 }}>
                      {deck.cardCount} {t.plural.cards(deck.cardCount)}
                    </span>
                  </div>
                </button>
                {iconPicker === deck.id && (
                  <>
                    {/* Backdrop transparent pour fermer au clic extérieur */}
                    <div
                      onClick={() => setIconPicker(null)}
                      style={{ position: "fixed", inset: 0, zIndex: 90 }}
                    />
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "100%",
                        zIndex: 91,
                        display: "grid",
                        gridTemplateColumns: `repeat(${DECK_ICONS.length}, 1fr)`,
                        gap: "2px",
                        padding: "0.5rem",
                        background: "var(--color-bg-secondary)",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      {DECK_COLORS.map(color => (
                        <div key={color} style={{ display: "contents" }}>
                          {DECK_ICONS.map(ic => (
                            <span
                              key={`${ic.name}:${color}`}
                              onClick={() => { onChangeIcon(deck.id, `${ic.name}:${color}`); setIconPicker(null); }}
                              title={ic.label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                background: deck.icon === `${ic.name}:${color}` ? "var(--color-bg-tertiary)" : "transparent",
                              }}
                            >
                              <DeckIcon icon={`${ic.name}:${color}`} size={14} />
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
        <button onClick={onExplore} style={{ margin: 0, width: "100%", padding: "0.75rem 1rem", fontSize: "1rem" }}>
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
