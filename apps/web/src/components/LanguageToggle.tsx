"use client";

import { IconFlagFR, IconFlagUS } from "./Icons";
import { useLanguage } from "../hooks/useLanguage";

const FLAG_SIZE = 16;

export function LanguageToggle() {
  const { lang, changeLanguage } = useLanguage();

  return (
    <button
      onClick={() => changeLanguage(lang === "fr" ? "en" : "fr")}
      className="header-action-btn"
      title={lang === "fr" ? "Switch to English" : "Passer en français"}
    >
      {lang === "fr" ? (
        <>
          <IconFlagFR size={FLAG_SIZE} />
          <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>FR</span>
        </>
      ) : (
        <>
          <IconFlagUS size={FLAG_SIZE} />
          <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>EN</span>
        </>
      )}
    </button>
  );
}
