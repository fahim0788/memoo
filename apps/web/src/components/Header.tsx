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
    <div className="header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: "44px" }}>
      {/* Left: Logo (home) or Back + Title (internal pages) */}
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
          <img src="/logo-memoo-black.png" alt="" style={{ width: "34px", height: "34px", flexShrink: 0 }} className="dark:hidden" />
          <img src="/logo-memoo-white.png" alt="" style={{ width: "34px", height: "34px", flexShrink: 0 }} className="hidden dark:block" />
          <span>{t.menu.title}</span>
        </h2>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1", minWidth: 0 }}>
          {onBack && (
            <button
              onClick={onBack}
              className="header-action-btn icon-clickable"
              title={t.common.back}
            >
              <IconArrowBack size={20} />
            </button>
          )}
          {secondaryActions}
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {title}
            </h3>
          )}
        </div>
      )}

      {/* Right: Profile + Language + Help + Settings */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "0 0 auto" }}>
        {userName && (
          <div
            onClick={onProfile}
            className={onProfile ? "icon-clickable" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              cursor: onProfile ? "pointer" : "default",
            }}
          >
            <IconProfile size={16} style={{ color: "var(--color-text-secondary)" }} />
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              {userName}
            </span>
          </div>
        )}
        <LanguageToggle />
        {onHelp && (
          <button onClick={onHelp} className="header-action-btn" title={t.help.title}>
            <IconHelp size={18} />
          </button>
        )}
        <SettingsButton onLogout={onLogout} />
      </div>
    </div>
  );
}
