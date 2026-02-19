"use client";

import { IconHome, IconSearch, IconPlus } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type BottomNavProps = {
  activeView: string;
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
};

export function BottomNav({ activeView, onHome, onExplore, onCreate }: BottomNavProps) {
  useLanguage();

  const tabs = [
    { id: "menu", icon: IconHome, label: t.nav.home, onClick: onHome },
    { id: "available", icon: IconSearch, label: t.nav.explore, onClick: onExplore },
    { id: "create", icon: IconPlus, label: t.nav.add, onClick: onCreate },
  ];

  return (
    <nav className="bottom-nav">
      {/* Logo — visible only in desktop sidebar mode */}
      <div className="bottom-nav-logo" onClick={onHome}>
        <img src="/logo-memoo-black.png" alt="Memoo" className="dark:hidden" />
        <img src="/logo-memoo-white.png" alt="Memoo" className="hidden dark:block" />
      </div>

      {tabs.map(tab => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`bottom-nav-tab ${isActive ? "active" : ""}`}
          >
            <tab.icon size={22} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
