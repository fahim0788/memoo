"use client";

import { useState, useEffect } from "react";
import { fetchLeaderboard, type LeaderboardEntry } from "../lib/api";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { IconTrophy } from "./Icons";

type LeaderboardViewProps = {
  deckId: string;
  deckName: string;
  onClose: () => void;
};

const RANK_COLORS: Record<number, string> = {
  1: "#f59e0b", // gold
  2: "#9ca3af", // silver
  3: "#d97706", // bronze
};

export function LeaderboardView({ deckId, deckName, onClose }: LeaderboardViewProps) {
  useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<{ rank: number; score: number; successRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLeaderboard(deckId);
        if (cancelled) return;
        setEntries(data.leaderboard);
        setCurrentUser(data.currentUser);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 100,
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(90vw, 400px)",
          maxHeight: "80vh",
          background: "var(--color-bg)",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <IconTrophy size={18} style={{ color: "#f59e0b" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="leaderboard-title" style={{ fontWeight: 700, fontSize: "1rem" }}>{t.leaderboard.title}</div>
            <div style={{
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{deckName}</div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              color: "var(--color-text-secondary)",
              padding: "4px",
              lineHeight: 1,
            }}
          >&times;</button>
        </div>

        {/* Content */}
        <div style={{ overflow: "auto", padding: "0.75rem 1.25rem", flex: 1 }}>
          {loading && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem 0" }}>
              {t.leaderboard.loading}
            </p>
          )}

          {error && (
            <p style={{ textAlign: "center", color: "var(--color-error)", padding: "2rem 0" }}>
              {error}
            </p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem 0" }}>
              {t.leaderboard.noData}
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {entries.map((entry) => {
                const isCurrentUser = currentUser && entry.rank === currentUser.rank && entry.score === currentUser.score;
                const rankColor = RANK_COLORS[entry.rank];
                return (
                  <div
                    key={entry.rank}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "10px",
                      background: isCurrentUser ? "var(--color-primary-light)" : "var(--color-bg-tertiary)",
                      border: isCurrentUser ? "1.5px solid var(--color-accent)" : "1px solid transparent",
                    }}
                  >
                    {/* Rank */}
                    <span style={{
                      fontWeight: 800,
                      fontSize: entry.rank <= 3 ? "1.1rem" : "0.9rem",
                      color: rankColor ?? "var(--color-text-muted)",
                      width: "28px",
                      textAlign: "center",
                      flexShrink: 0,
                    }}>
                      {entry.rank}
                    </span>

                    {/* Name */}
                    <span style={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: isCurrentUser ? 700 : 500,
                      fontSize: "0.9rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {entry.firstName}
                      {isCurrentUser && (
                        <span style={{ color: "var(--color-accent)", marginLeft: "4px", fontSize: "0.75rem" }}>
                          {t.leaderboard.you}
                        </span>
                      )}
                    </span>

                    {/* Score + Success rate */}
                    <span style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{entry.score}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        {entry.successRate}% {t.leaderboard.successRate.toLowerCase()}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - current user summary if not in top visible */}
        {currentUser && !loading && entries.length > 0 && (
          <div style={{
            padding: "0.5rem 1.25rem",
            borderTop: "1px solid var(--color-border)",
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            textAlign: "center",
          }}>
            {t.leaderboard.rank} {currentUser.rank} / {entries.length} &middot; {t.leaderboard.score} : {currentUser.score}
          </div>
        )}
      </div>
    </div>
  );
}
