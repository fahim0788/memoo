"use client";

import { IconHome, IconCompass, IconPlus } from "./Icons";
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
    { id: "available", icon: IconCompass, label: t.nav.explore, onClick: onExplore },
    { id: "create", icon: IconPlus, label: t.nav.add, onClick: onCreate },
  ];

  return (
    <nav className="bottom-nav">
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
