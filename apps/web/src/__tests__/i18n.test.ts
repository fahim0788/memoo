import { describe, it, expect, beforeEach } from "vitest";
import {
  getTranslations,
  getCurrentLanguage,
  setLanguage,
  t,
  type Language,
  type Translations,
} from "../lib/i18n";

describe("i18n", () => {
  beforeEach(() => {
    // Reset to default French
    setLanguage("fr");
  });

  describe("getCurrentLanguage", () => {
    it("defaults to french", () => {
      expect(getCurrentLanguage()).toBe("fr");
    });

    it("returns english after switching", () => {
      setLanguage("en");
      expect(getCurrentLanguage()).toBe("en");
    });
  });

  describe("setLanguage", () => {
    it("persists to localStorage", () => {
      setLanguage("en");
      expect(localStorage.getItem("memoo-language")).toBe("en");
    });

    it("dispatches language-change event", () => {
      let eventFired = false;
      window.addEventListener("language-change", () => { eventFired = true; }, { once: true });
      setLanguage("en");
      expect(eventFired).toBe(true);
    });
  });

  describe("getTranslations", () => {
    it("returns french translations by default", () => {
      const trans = getTranslations();
      expect(trans.common.save).toBe("Enregistrer");
      expect(trans.auth.loginButton).toBe("Se connecter");
    });

    it("returns english translations after switch", () => {
      setLanguage("en");
      const trans = getTranslations();
      expect(trans.common.save).toBe("Save");
      expect(trans.auth.loginButton).toBe("Sign in");
    });
  });

  describe("t proxy", () => {
    it("accesses french translations by default", () => {
      expect(t.common.back).toBe("← Retour");
    });

    it("reacts to language switch", () => {
      setLanguage("en");
      expect(t.common.back).toBe("← Back");
    });

    it("accesses nested sections", () => {
      expect(t.menu.title).toBe("Memoo");
      expect(t.study.validate).toBe("Valider");
      expect(t.errors.network).toContain("réseau");
    });
  });

  describe("translation completeness", () => {
    const sections: (keyof Translations)[] = [
      "common", "auth", "menu", "study", "edit", "create",
      "available", "menuView", "stats", "sync", "dialog",
      "errors", "settings", "chapters", "plural",
    ];

    it("french has all sections", () => {
      setLanguage("fr");
      const trans = getTranslations();
      for (const section of sections) {
        expect(trans[section], `missing fr section: ${section}`).toBeDefined();
      }
    });

    it("english has all sections", () => {
      setLanguage("en");
      const trans = getTranslations();
      for (const section of sections) {
        expect(trans[section], `missing en section: ${section}`).toBeDefined();
      }
    });

    it("french and english have the same keys in each section", () => {
      setLanguage("fr");
      const fr = getTranslations();
      setLanguage("en");
      const en = getTranslations();

      for (const section of sections) {
        const frKeys = Object.keys(fr[section]).sort();
        const enKeys = Object.keys(en[section]).sort();
        expect(frKeys, `key mismatch in section: ${section}`).toEqual(enKeys);
      }
    });

    it("no empty string values in french", () => {
      setLanguage("fr");
      const trans = getTranslations();
      for (const section of sections) {
        if (section === "plural") continue; // plural values are functions
        const values = Object.values(trans[section] as Record<string, string>);
        for (const val of values) {
          expect(val.length, `empty value in fr.${section}`).toBeGreaterThan(0);
        }
      }
    });

    it("no empty string values in english", () => {
      setLanguage("en");
      const trans = getTranslations();
      for (const section of sections) {
        if (section === "plural") continue;
        const values = Object.values(trans[section] as Record<string, string>);
        for (const val of values) {
          expect(val.length, `empty value in en.${section}`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("plural functions", () => {
    it("french: singular for 1, plural for >1", () => {
      setLanguage("fr");
      const p = getTranslations().plural;
      expect(p.cards(1)).toBe("carte");
      expect(p.cards(2)).toBe("cartes");
      expect(p.cards(0)).toBe("cartes");
      expect(p.days(1)).toBe("jour");
      expect(p.days(5)).toBe("jours");
      expect(p.operations(1)).toBe("opération");
      expect(p.operations(3)).toBe("opérations");
      expect(p.revisions(1)).toBe("révision");
      expect(p.revisions(10)).toBe("révisions");
      expect(p.actions(1)).toBe("action");
      expect(p.actions(2)).toBe("actions");
    });

    it("english: singular for 1, plural for >1", () => {
      setLanguage("en");
      const p = getTranslations().plural;
      expect(p.cards(1)).toBe("card");
      expect(p.cards(2)).toBe("cards");
      expect(p.days(1)).toBe("day");
      expect(p.days(5)).toBe("days");
      expect(p.operations(1)).toBe("operation");
      expect(p.operations(3)).toBe("operations");
      expect(p.revisions(1)).toBe("review");
      expect(p.revisions(10)).toBe("reviews");
      expect(p.actions(1)).toBe("action");
      expect(p.actions(2)).toBe("actions");
    });
  });
});
