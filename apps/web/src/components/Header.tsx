"use client";

import { SettingsButton } from "./SettingsButton";
import { LanguageToggle } from "./LanguageToggle";
import { IconProfile, IconHelp, IconArrowBack } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type HeaderProps = {
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
  onBack?: () => void;
  title?: React.ReactNode;
  secondaryActions?: React.ReactNode;
};

export function Header({ userName, onLogout, onHelp, onProfile, onBack, title, secondaryActions }: HeaderProps) {
  useLanguage();

  const isHome = !title && !onBack && !secondaryActions;

  return (
    <div className="header" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Row 1: Back/Logo + Right actions */}
      <div className="header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: "44px" }}>
        {/* Left: Logo (home) or Back (internal pages) */}
        {isHome ? (
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 400,
              margin: 0,
              flex: "0 0 auto",
            }}
          >
            <img src="/logo-memoo-black.png" alt="" style={{ width: "34px", height: "34px", flexShrink: 0 }} className="dark:hidden header-logo-img" />
            <img src="/logo-memoo-white.png" alt="" style={{ width: "34px", height: "34px", flexShrink: 0 }} className="hidden dark:block header-logo-img" />
            <span>{t.menu.title}</span>
          </h2>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1", minWidth: 0 }}>
            {onBack && (
              <button
                onClick={onBack}
                className="header-action-btn icon-clickable header-back-btn"
                aria-label={t.common.back}
                title={t.common.back}
              >
                <IconArrowBack size={20} />
              </button>
            )}
            {secondaryActions}
          </div>
        )}

        {/* Right: Profile + Language + Help + Settings */}
        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "0 0 auto" }}>
          {userName && onProfile ? (
            <button
              onClick={onProfile}
              className="header-action-btn icon-clickable"
              aria-label={t.profile?.title ?? "Profil"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <IconProfile size={16} style={{ color: "var(--color-text-secondary)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {userName}
              </span>
            </button>
          ) : userName ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <IconProfile size={16} style={{ color: "var(--color-text-secondary)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {userName}
              </span>
            </span>
          ) : null}
          <LanguageToggle />
          {onHelp && (
            <button onClick={onHelp} className="header-action-btn" title={t.help.title}>
              <IconHelp size={18} />
            </button>
          )}
          <SettingsButton onLogout={onLogout} />
        </div>
      </div>

      {/* Row 2: Title on its own line (only for internal pages) */}
      {!isHome && title && (
        <h3 className="header-title" style={{
          margin: "0.15rem 0 0 0",
          fontSize: "0.9rem",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.35,
        }}>
          {title}
        </h3>
      )}
    </div>
  );
}
