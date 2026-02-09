"use client";

import { SettingsButton } from "./SettingsButton";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

// Profile Icon SVG
function ProfileIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0 2c-3.313 0-10 1.657-10 5v3h20v-3c0-3.343-6.687-5-10-5z" />
    </svg>
  );
}

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
              <ProfileIcon className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
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
                <svg width="14" height="10" viewBox="0 0 21 15"><rect width="7" height="15" fill="#0055A4"/><rect x="7" width="7" height="15" fill="#fff"/><rect x="14" width="7" height="15" fill="#EF4135"/></svg>
                FR
              </>
            ) : (
              <>
                <svg width="14" height="10" viewBox="0 0 21 15"><rect width="21" height="15" fill="#fff"/><rect y="0" width="21" height="1.15" fill="#B22234"/><rect y="2.31" width="21" height="1.15" fill="#B22234"/><rect y="4.62" width="21" height="1.15" fill="#B22234"/><rect y="6.92" width="21" height="1.15" fill="#B22234"/><rect y="9.23" width="21" height="1.15" fill="#B22234"/><rect y="11.54" width="21" height="1.15" fill="#B22234"/><rect y="13.85" width="21" height="1.15" fill="#B22234"/><rect width="8.4" height="8.08" fill="#3C3B6E"/></svg>
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
          borderTop: "1px solid var(--color-border)"
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
