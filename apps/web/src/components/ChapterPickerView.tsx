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
          height: "6px",
          borderRadius: "3px",
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

          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              className="card-button"
              onClick={() => onStudyChapter(chapter.id)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 0.5rem",
                background: "transparent",
                border: "none",
                borderTop: index >= 0 ? "1px solid var(--color-border)" : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{chapter.name}</div>
                {chapter.description && (
                  <div className="small" style={{ color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    {chapter.description}
                  </div>
                )}
              </div>
              <div className="small" style={{ color: "var(--color-text-secondary)", flexShrink: 0, marginLeft: "0.5rem" }}>
                {chapter.cardCount} {t.plural.cards(chapter.cardCount)}
              </div>
            </button>
          ))}
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
