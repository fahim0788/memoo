"use client";

import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { Header } from "./Header";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatsCard } from "./StatsCard";
import type { Stats } from "../hooks/useStats";
import { IconFolderPublic, IconLockPrivate, IconEdit, IconTrash, IconArrowUp, IconArrowDown, IconTrophy, DeckIcon, DECK_ICONS, DECK_COLORS } from "./Icons";
import { LeaderboardView } from "./LeaderboardView";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { chapterStatusColor, type ChapterStatus } from "../lib/chapter-status";

type MenuViewProps = {
  myLists: DeckFromApi[];
  userName: string;
  onStudy: (deck: DeckFromApi) => void;
  onEdit: (deck: DeckFromApi) => void;
  onRemove: (deckId: string) => void;
  onReorder: (deckIds: string[]) => void;
  onChangeIcon: (deckId: string, icon: string) => void;
  onLogout: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
  stats: Stats | null;
  chapterProgress?: Record<string, { statuses: Record<string, ChapterStatus>; orderedIds: string[] }>;
};

export function MenuView({
  myLists,
  userName,
  onStudy,
  onEdit,
  onRemove,
  onReorder,
  onChangeIcon,
  onLogout,
  onHelp,
  onProfile,
  stats,
  chapterProgress,
}: MenuViewProps) {
  useLanguage();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [animating, setAnimating] = useState<string | null>(null);
  const [iconPicker, setIconPicker] = useState<string | null>(null);
  const [leaderboardDeck, setLeaderboardDeck] = useState<{ id: string; name: string } | null>(null);

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
      <Header userName={userName} onLogout={onLogout} onHelp={onHelp} onProfile={onProfile} />

      {stats && <StatsCard stats={stats} />}

      {myLists.length > 0 && (
        <div className="card">
          <div className="small">{t.menu.myLists}</div>
          {myLists.length >= 3 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.menuView.searchPlaceholder}
              aria-label={t.menuView.searchPlaceholder}
              style={{ marginBottom: "0.25rem" }}
            />
          )}
          {filteredLists.map((deck) => {
            const originalIndex = myLists.findIndex(d => d.id === deck.id);
            const isAnimating = animating === deck.id;
            const hasDue = (stats?.duePerDeck?.[deck.id] ?? 0) > 0;
            return (
              <div key={deck.id} style={{ position: "relative", width: "100%" }}>
                <div
                  role="button"
                  tabIndex={0}
                  className="primary card-button"
                  style={{
                    position: "relative",
                    width: "100%",
                    overflow: "hidden",
                    transition: isAnimating ? "transform 0.3s ease-in-out" : "none",
                    transform: isAnimating ? "scale(1.02)" : "scale(1)",
                    opacity: hasDue ? 1 : 0.5,
                    cursor: "pointer",
                  }}
                  onClick={() => onStudy(deck)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStudy(deck); } }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Reorder buttons (only show in non-filtered view) */}
                    {!q && myLists.length > 1 && (
                      <span
                        style={{ display: "flex", flexDirection: "column", gap: "2px", flex: "none" }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleMoveUp(originalIndex)}
                          className="reorder-btn"
                          aria-label={t.menuView.moveUp}
                          disabled={originalIndex === 0}
                          style={{
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                            opacity: originalIndex === 0 ? 0.3 : 1,
                            background: "none",
                            border: "none",
                            cursor: originalIndex === 0 ? "default" : "pointer",
                            minWidth: 0,
                          }}
                        >
                          <IconArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(originalIndex)}
                          className="reorder-btn"
                          aria-label={t.menuView.moveDown}
                          disabled={originalIndex === myLists.length - 1}
                          style={{
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                            opacity: originalIndex === myLists.length - 1 ? 0.3 : 1,
                            background: "none",
                            border: "none",
                            cursor: originalIndex === myLists.length - 1 ? "default" : "pointer",
                            minWidth: 0,
                          }}
                        >
                          <IconArrowDown size={12} />
                        </button>
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
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{deck.name}</span>
                    <span
                      style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", marginLeft: "10px", justifyContent: "flex-end" }}
                      onClick={e => e.stopPropagation()}
                    >
                      {deck.isOwned && (
                        <button
                          onClick={() => onEdit(deck)}
                          className="action-icon"
                          aria-label={t.common.edit}
                          title={t.common.edit}
                        >
                          <IconEdit size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setRemoveTarget({ id: deck.id, name: deck.name })}
                        className="action-icon delete"
                        aria-label={t.common.remove}
                        title={t.common.remove}
                      >
                        <IconTrash size={14} />
                      </button>
                      {!deck.isOwned && (
                        <button
                          onClick={() => setLeaderboardDeck({ id: deck.id, name: deck.name })}
                          className="action-icon"
                          aria-label={t.leaderboard.title}
                          title={t.leaderboard.title}
                        >
                          <IconTrophy size={14} />
                        </button>
                      )}
                      <span style={{ width: "1px", height: "14px", background: "var(--color-border)", opacity: 0.6 }} />
                      {deck.isOwned ? (
                        <IconLockPrivate size={14} style={{ opacity: 0.5 }} />
                      ) : (
                        <IconFolderPublic size={14} style={{ opacity: 0.5 }} />
                      )}
                    </span>
                  </div>
                  <div style={{ marginTop: "2px", paddingBottom: (deck.chapterCount ?? 0) > 0 ? "6px" : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="small" style={{ fontWeight: 400 }}>
                      {(() => {
                        const dueCount = stats?.duePerDeck?.[deck.id] ?? 0;
                        return <>{dueCount} {t.chapters.dueLabel} <span style={{ color: "var(--color-text-muted)" }}>/ {deck.cardCount} {t.plural.cards(deck.cardCount)}</span></>;
                      })()}
                    </span>
                    {(deck.chapterCount ?? 0) > 0 && (
                      <span className="small" style={{ fontWeight: 400, flexShrink: 0, marginLeft: "8px" }}>
                        {deck.chapterCount} {t.plural.chapters(deck.chapterCount!)}
                      </span>
                    )}
                  </div>
                  {(deck.chapterCount ?? 0) > 0 && (() => {
                    const total = deck.chapterCount!;
                    const progress = chapterProgress?.[deck.id];
                    // Use ordered chapter IDs (same order as ChapterPickerView)
                    const segments: ChapterStatus[] = progress
                      ? progress.orderedIds
                          .map((id) => progress.statuses[id] || "not-started")
                          .concat(Array(Math.max(0, total - progress.orderedIds.length)).fill("not-started"))
                          .slice(0, total)
                      : Array(total).fill("not-started");
                    return (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: "flex",
                        gap: "3px",
                        padding: "0 1px",
                        height: "3px",
                      }}>
                        {segments.map((status, i) => (
                          <span
                            key={i}
                            style={{
                              flex: 1,
                              height: "4px",
                              background: chapterStatusColor(status),
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
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

      {myLists.length > 0 && myLists.some(d => (d.chapterCount ?? 0) > 0) && (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {([
            ["not-started", t.menuView.legendNotStarted],
            ["in-progress", t.menuView.legendInProgress],
            ["studied", t.menuView.legendStudied],
          ] as [ChapterStatus, string][]).map(([status, label]) => (
            <span key={status} className="small" style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-text-muted)" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: chapterStatusColor(status), flexShrink: 0 }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {myLists.length === 0 && (
        <div className="card">
          <p className="small">{t.menuView.noDecksCta}</p>
        </div>
      )}

      {leaderboardDeck && (
        <LeaderboardView
          deckId={leaderboardDeck.id}
          deckName={leaderboardDeck.name}
          onClose={() => setLeaderboardDeck(null)}
        />
      )}

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
