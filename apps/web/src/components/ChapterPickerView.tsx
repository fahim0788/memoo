"use client";

import type { ChapterFromApi, DeckFromApi } from "../lib/api";
import { Header } from "./Header";

import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { chapterStatusColor, type ChapterStatus } from "../lib/chapter-status";

type ChapterPickerViewProps = {
  deck: DeckFromApi;
  chapters: ChapterFromApi[];
  totalCardCount: number;
  classifying: boolean;
  chapterStatuses?: Record<string, ChapterStatus>;
  duePerChapter?: Record<string, number>;
  onStudyAll: () => void;
  onStudyChapter: (chapterId: string) => void;
  onClassify: () => void;
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
};

export function ChapterPickerView({
  deck,
  chapters,
  totalCardCount,
  classifying,
  chapterStatuses,
  duePerChapter,
  onStudyAll,
  onStudyChapter,
  onClassify,
  onBack,
  userName,
  onLogout,
  onHelp,
  onProfile,
}: ChapterPickerViewProps) {
  useLanguage();

  const hasChapters = chapters.length > 0;

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHelp={onHelp}
        onProfile={onProfile}
        title={deck.name}
        onBack={onBack}
      />

      {/* Study All button */}
      <button
        className="primary"
        onClick={onStudyAll}
        style={{
          width: "100%",
          padding: "0.875rem 1rem",
          fontSize: "1rem",
          fontWeight: 600,
        }}
      >
        {t.chapters.studyAll} ({totalCardCount} {t.plural.cards(totalCardCount)})
      </button>

      {/* Chapter progress bar */}
      {hasChapters && (
        <div style={{
          display: "flex",
          gap: "2px",
          height: "2px",
          borderRadius: "1px",
          overflow: "hidden",
        }}>
          {chapters.map((ch) => {
            const status = chapterStatuses?.[ch.id] || "not-started";
            return (
              <span
                key={ch.id}
                style={{
                  flex: 1,
                  height: "100%",
                  borderRadius: "3px",
                  background: chapterStatusColor(status),
                }}
              />
            );
          })}
        </div>
      )}

      {/* Chapters list */}
      {hasChapters && (
        <div className="card">
          <div className="small" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
            {t.chapters.title} ({chapters.length})
          </div>

          {chapters.map((chapter) => {
            const status = chapterStatuses?.[chapter.id] || "not-started";
            const dueCount = duePerChapter?.[chapter.id] || 0;
            const hasDue = dueCount > 0;
            return (
              <button
                key={chapter.id}
                className="primary card-button"
                onClick={() => onStudyChapter(chapter.id)}
                style={{
                  position: "relative",
                  width: "100%",
                  overflow: "hidden",
                  opacity: hasDue ? 1 : 0.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
                    {chapter.name}
                  </span>
                </div>
                {chapter.description && (
                  <div className="small" style={{ color: "var(--color-text-secondary)", marginTop: "2px", textAlign: "left" }}>
                    {chapter.description}
                  </div>
                )}
                <div style={{ marginTop: "2px" }}>
                  <span className="small" style={{ fontWeight: 400 }}>
                    {dueCount} {t.chapters.dueLabel} <span style={{ color: "var(--color-text-muted)" }}>/ {chapter.cardCount} {t.plural.cards(chapter.cardCount)}</span>
                  </span>
                </div>
                <span style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: chapterStatusColor(status),
                }} />
              </button>
            );
          })}
        </div>
      )}

      {/* No chapters message */}
      {!hasChapters && !classifying && (
        <div className="card">
          <p className="small" style={{ color: "var(--color-text-secondary)", textAlign: "center" }}>
            {t.chapters.noChapters}
          </p>
        </div>
      )}

      {/* Classify / Reclassify button */}
      <button
        onClick={onClassify}
        disabled={classifying}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
          opacity: classifying ? 0.6 : 1,
          cursor: classifying ? "wait" : "pointer",
        }}
      >
        {classifying
          ? t.chapters.classifying
          : hasChapters
            ? t.chapters.reclassify
            : t.chapters.classify}
      </button>
    </>
  );
}
