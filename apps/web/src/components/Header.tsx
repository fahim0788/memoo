"use client";

import { SettingsButton } from "./SettingsButton";
import { t } from "../lib/i18n";

type HeaderProps = {
  userName?: string;
  onLogout?: () => void;
  rightContent?: React.ReactNode;
};

export function Header({ userName, onLogout, rightContent }: HeaderProps) {
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

        {rightContent || (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {userName && (
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {userName}
              </span>
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
        )}
      </div>
    </div>
  );
}
