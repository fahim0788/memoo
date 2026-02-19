"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { IconGear, IconSun, IconMoon, IconClose } from "./Icons";
import { useTheme } from "../hooks/useTheme";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

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
        <IconGear size={20} className="w-5 h-5" />
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
        <IconGear size={20} className="w-5 h-5" />
      </button>

      {/* Settings Panel Overlay — portal to body to escape header's backdrop-filter containing block */}
      {isOpen && createPortal(
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
                border: "none",
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
              <IconClose size={20} className="w-5 h-5" />
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
                    color: "var(--color-text)",
                    border: "none",
                  }}
                  onClick={() => {
                    if (theme !== "light") toggleTheme();
                  }}
                >
                  <IconSun size={20} className="w-5 h-5 mx-auto mb-2 text-[var(--color-accent)]" />
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
                    color: "var(--color-text)",
                    border: "none",
                  }}
                  onClick={() => {
                    if (theme !== "dark") toggleTheme();
                  }}
                >
                  <IconMoon size={20} className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
                  {t.settings.dark}
                </button>
              </div>
            </div>

            {/* Logout Section */}
            <div className="mt-8 pt-4" style={{ borderTop: "none" }}>
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
                      border: "none",
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
            <div className="mt-8 pt-4" style={{ borderTop: "none" }}>
              <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                {t.settings.version}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
