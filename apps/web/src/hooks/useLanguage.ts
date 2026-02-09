"use client";

import { useState, useEffect } from "react";
import { getCurrentLanguage, setLanguage, type Language } from "../lib/i18n";

/**
 * Hook pour gérer la langue de l'application
 * Re-render automatique lors du changement de langue
 */
export function useLanguage() {
  const [lang, setLang] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    // Re-render quand la langue change (via event)
    const handleLanguageChange = () => {
      setLang(getCurrentLanguage());
    };

    window.addEventListener("language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("language-change", handleLanguageChange);
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
  };

  return { lang, changeLanguage };
}
