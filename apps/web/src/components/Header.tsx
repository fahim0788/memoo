"use client";

import { SettingsButton } from "./SettingsButton";
import { IconProfile, IconFlagFR, IconFlagUS } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type HeaderProps = {
  userName?: string;
  onLogout?: () => void;
  onHome?: () => void;
  title?: React.ReactNode;
  secondaryActions?: React.ReactNode;
};

export function Header({ userName, onLogout, onHome, title, secondaryActions }: HeaderProps) {
  const { lang, changeLanguage } = useLanguage();

  return (
    <div className="header" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Main header line: Logo + App Name | Profile + Settings + Logout */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        minHeight: "44px"
      }}>
        <h2
          onClick={onHome}
          className={onHome ? "logo-clickable" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontWeight: 400,
            margin: 0,
            flex: "0 0 auto",
            cursor: onHome ? "pointer" : "default",
          }}
        >
          <img
            src="/logo-memoo-black.png"
            alt=""
            style={{ width: "34px", height: "34px", flexShrink: 0 }}
            className="dark:hidden"
          />
          <img
            src="/logo-memoo-white.png"
            alt=""
            style={{ width: "34px", height: "34px", flexShrink: 0 }}
            className="hidden dark:block"
          />
          <span>{t.menu.title}</span>
        </h2>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flex: "0 0 auto"
        }}>
          {/* Always visible: profile + settings + language */}
          {userName && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <IconProfile size={16} style={{ color: "var(--color-text-secondary)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {userName}
              </span>
            </div>
          )}
          <button
            onClick={() => changeLanguage(lang === 'fr' ? 'en' : 'fr')}
            className="icon-clickable"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              minWidth: 0,
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
            title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
          >
            {lang === 'fr' ? (
              <>
                <IconFlagFR size={15} />
                FR
              </>
            ) : (
              <>
                <IconFlagUS size={14} />
                EN
              </>
            )}
          </button>
          <SettingsButton onLogout={onLogout} />
        </div>
      </div>

      {/* Secondary line: Back button + Page title + Actions */}
      {(title || secondaryActions) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "0.75rem",
          paddingTop: "0.75rem",
          borderTop: "none"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1", minWidth: 0 }}>
            {secondaryActions}
            {title && (
              <h3 style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {title}
              </h3>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
