"use client";

import { SettingsButton } from "./SettingsButton";
import { t } from "../lib/i18n";

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
  actions?: React.ReactNode;
};

export function Header({ userName, onLogout, actions }: HeaderProps) {
  return (
    <div className="header">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 400 }}>
          <img
            src="/logo-memoo-black.png"
            alt=""
            style={{ width: "34px", height: "34px" }}
            className="dark:hidden"
          />
          <img
            src="/logo-memoo-white.png"
            alt=""
            style={{ width: "34px", height: "34px" }}
            className="hidden dark:block"
          />
          {t.menu.title}
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Custom actions (e.g., stats badge, back button) */}
          {actions && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {actions}
            </div>
          )}

          {/* Always visible: profile + settings + logout */}
          {userName && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ProfileIcon className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {userName}
              </span>
            </div>
          )}
          <SettingsButton />
          {onLogout && (
            <button
              onClick={onLogout}
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", minWidth: "auto" }}
            >
              {t.auth.logoutButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
