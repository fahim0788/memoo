"use client";

import { Header } from "./Header";

import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

type HelpViewProps = {
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onProfile?: () => void;
};

export function HelpView({ onBack, userName, onLogout, onProfile }: HelpViewProps) {
  useLanguage();

  const sections = [
    { title: t.help.welcomeTitle, text: t.help.welcomeText },
    { title: t.help.studyTitle, text: t.help.studyText },
    { title: t.help.listsTitle, text: t.help.listsText },
    { title: t.help.createTitle, text: t.help.createText },
    { title: t.help.chaptersTitle, text: t.help.chaptersText },
    { title: t.help.aiTitle, text: t.help.aiText },
    { title: t.help.offlineTitle, text: t.help.offlineText },
    { title: t.help.settingsTitle, text: t.help.settingsText },
    { title: t.help.tipsTitle, text: t.help.tipsText },
  ];

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onProfile={onProfile}
        title={t.help.title}
        onBack={onBack}
      />

      <div className="help-content">
        {sections.map((section, i) => (
          <div key={i} className="help-section">
            <h3 className="help-section-title">{section.title}</h3>
            <p className="help-section-text">{section.text}</p>
          </div>
        ))}

        <div className="help-footer">
          Memoo v0.1.0
        </div>
      </div>
    </>
  );
}
