"use client";

import type { Stats } from "../hooks/useStats";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type StatsCardProps = {
  stats: Stats;
};

/** Mini banner: today count + streak, shown on the menu */
export function StatsCard({ stats }: StatsCardProps) {
  useLanguage();
  if (stats.todayTotal === 0 && stats.streak === 0) return null;

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <div style={{
        flex: 1,
        minWidth: "120px",
        padding: "0.5rem 0.75rem",
        borderRadius: "12px",
        background: "var(--color-primary-light)",
      }}>
        <div className="small">{t.stats.todayLabel}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          {stats.todayTotal}
          <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "4px", color: "var(--color-text-secondary)" }}>
            {t.plural.cards(stats.todayTotal)}
          </span>
        </div>
      </div>
      <div style={{
        flex: 1,
        minWidth: "120px",
        padding: "0.5rem 0.75rem",
        borderRadius: "12px",
        background: "var(--color-primary-light)",
      }}>
        <div className="small">{t.stats.streak}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          {stats.streak > 0 ? stats.streak : "-"}
          <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "4px", color: "var(--color-text-secondary)" }}>
            {stats.streak > 0 ? t.plural.days(stats.streak) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Detailed stats: success rates + upcoming reviews, shown on profile */
export function StatsDetail({ stats }: StatsCardProps) {
  useLanguage();
  const totalUpcoming = stats.upcoming.reduce((s, b) => s + b.count, 0);
  const hasContent = stats.perDeck.length > 0 || totalUpcoming > 0;

  if (!hasContent) return null;

  return (
    <div className="card">
      <div className="small" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{t.stats.title}</div>

      {/* Today + Streak summary */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: stats.perDeck.length > 0 || totalUpcoming > 0 ? "0.75rem" : 0 }}>
        <div style={{
          flex: 1,
          minWidth: "120px",
          padding: "0.5rem 0.75rem",
          borderRadius: "12px",
          background: "var(--color-primary-light)",
        }}>
          <div className="small">{t.stats.todayLabel}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {stats.todayTotal}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "4px", color: "var(--color-text-secondary)" }}>
              {t.plural.cards(stats.todayTotal)}
            </span>
          </div>
        </div>
        <div style={{
          flex: 1,
          minWidth: "120px",
          padding: "0.5rem 0.75rem",
          borderRadius: "12px",
          background: "var(--color-primary-light)",
        }}>
          <div className="small">{t.stats.streak}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {stats.streak > 0 ? stats.streak : "-"}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "4px", color: "var(--color-text-secondary)" }}>
              {stats.streak > 0 ? t.plural.days(stats.streak) : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Success rate per deck */}
      {stats.perDeck.length > 0 && (
        <div>
          <div className="small" style={{ marginBottom: "0.4rem" }}>{t.stats.successRate}</div>
          {stats.perDeck.map(d => (
            <div key={d.deckId} style={{ marginBottom: "0.35rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "2px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                  {d.deckName}
                </span>
                <span style={{ fontWeight: 600 }}>{d.successRate}%</span>
              </div>
              <div style={{
                height: "6px",
                borderRadius: "3px",
                background: "var(--color-bg-tertiary)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${d.successRate}%`,
                  borderRadius: "3px",
                  background: d.successRate >= 70
                    ? "var(--color-success)"
                    : d.successRate >= 40
                      ? "var(--color-accent)"
                      : "var(--color-error)",
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming reviews */}
      {totalUpcoming > 0 && (
        <div style={{ marginTop: stats.perDeck.length > 0 ? "0.5rem" : 0 }}>
          <div className="small" style={{ marginBottom: "0.4rem" }}>{t.stats.nextReviews}</div>
          {stats.upcoming.filter(b => b.count > 0).map(b => (
            <div key={b.label} style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              padding: "0.15rem 0",
            }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{b.label}</span>
              <span style={{ fontWeight: 600 }}>{b.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
