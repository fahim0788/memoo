"use client";

import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

// Gear/Cog Icon SVG
function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Sun Icon for Light Mode
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

// Moon Icon for Dark Mode
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

// Close Icon
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

type SettingsButtonProps = {
  onLogout?: () => void;
};

export function SettingsButton({ onLogout }: SettingsButtonProps = {}) {
  useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        aria-label="Paramètres"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          minWidth: 0,
          flex: "none",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        <GearIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t.settings.title}
        title={t.settings.title}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          minWidth: 0,
          flex: "none",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        <GearIcon className="w-5 h-5" />
      </button>

      {/* Settings Panel Overlay */}
      {isOpen && (
        <div className="settings-panel" onClick={() => setIsOpen(false)}>
          <div
            className="settings-content"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative" }}
          >
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                {t.settings.title}
              </h3>
            </div>

            {/* Close Button - Top Right Corner */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label={t.settings.closeButton}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                width: "2rem",
                height: "2rem",
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-bg-tertiary)",
                border: "1px solid var(--color-border)",
                borderRadius: "2px",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-border-hover)";
                e.currentTarget.style.color = "var(--color-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-bg-tertiary)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            {/* Theme Options */}
            <div className="space-y-4">
              <label className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {t.settings.appearance}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    theme === "light"
                      ? "ring-2 ring-[var(--color-primary)]"
                      : ""
                  }`}
                  style={{
                    background: theme === "light" ? "var(--color-primary-light)" : "var(--color-bg-tertiary)",
                    borderColor: theme === "light" ? "var(--color-primary)" : "var(--color-border)",
                    color: "var(--color-text)",
                    border: "1px solid",
                  }}
                  onClick={() => {
                    if (theme !== "light") toggleTheme();
                  }}
                >
                  <SunIcon className="w-5 h-5 mx-auto mb-2 text-[var(--color-accent)]" />
                  {t.settings.light}
                </button>
                <button
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    theme === "dark"
                      ? "ring-2 ring-[var(--color-primary)]"
                      : ""
                  }`}
                  style={{
                    background: theme === "dark" ? "var(--color-primary-light)" : "var(--color-bg-tertiary)",
                    borderColor: theme === "dark" ? "var(--color-primary)" : "var(--color-border)",
                    color: "var(--color-text)",
                    border: "1px solid",
                  }}
                  onClick={() => {
                    if (theme !== "dark") toggleTheme();
                  }}
                >
                  <MoonIcon className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
                  {t.settings.dark}
                </button>
              </div>
            </div>

            {/* Logout Section */}
            <div className="mt-8 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <label className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {t.settings.account}
              </label>
              {onLogout && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      background: "var(--color-error-light)",
                      border: "1px solid var(--color-error-border)",
                      borderRadius: "8px",
                      color: "var(--color-error)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--color-error)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--color-error-light)";
                      e.currentTarget.style.color = "var(--color-error)";
                    }}
                  >
                    {t.settings.logout}
                  </button>
                </div>
              )}
            </div>

            {/* Version */}
            <div className="mt-8 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                {t.settings.version}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
