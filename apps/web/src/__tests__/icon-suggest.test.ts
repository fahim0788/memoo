import { describe, it, expect } from "vitest";
import { suggestIcon } from "../lib/icon-suggest";

describe("icon-suggest", () => {
  describe("flag/country patterns", () => {
    it("matches 'Drapeaux du monde'", () => {
      expect(suggestIcon("Drapeaux du monde")).toBe("flag:#ef4444");
    });

    it("matches 'Flags of Europe'", () => {
      expect(suggestIcon("Flags of Europe")).toBe("flag:#ef4444");
    });

    it("matches 'Pays asiatiques'", () => {
      expect(suggestIcon("Pays asiatiques")).toBe("flag:#ef4444");
    });

    it("matches 'Countries of Africa'", () => {
      expect(suggestIcon("Countries of Africa")).toBe("flag:#ef4444");
    });
  });

  describe("language patterns", () => {
    it("matches 'Anglais B2'", () => {
      expect(suggestIcon("Anglais B2")).toBe("book:#3b82f6");
    });

    it("matches 'English vocabulary'", () => {
      expect(suggestIcon("English vocabulary")).toBe("book:#3b82f6");
    });

    it("matches 'Vocabulaire français'", () => {
      expect(suggestIcon("Vocabulaire français")).toBe("book:#3b82f6");
    });

    it("matches 'Mots espagnol'", () => {
      expect(suggestIcon("Mots espagnol")).toBe("book:#3b82f6");
    });

    it("matches 'Phrases courantes'", () => {
      expect(suggestIcon("Phrases courantes")).toBe("book:#3b82f6");
    });
  });

  describe("music patterns", () => {
    it("matches 'Musique classique'", () => {
      expect(suggestIcon("Musique classique")).toBe("music:#8b5cf6");
    });

    it("matches 'Instruments de musique'", () => {
      expect(suggestIcon("Instruments de musique")).toBe("music:#8b5cf6");
    });
  });

  describe("science patterns", () => {
    it("matches 'Sciences naturelles'", () => {
      expect(suggestIcon("Sciences naturelles")).toBe("flask:#10b981");
    });

    it("matches 'Chimie organique'", () => {
      expect(suggestIcon("Chimie organique")).toBe("flask:#10b981");
    });

    it("matches 'Physique quantique'", () => {
      expect(suggestIcon("Physique quantique")).toBe("flask:#10b981");
    });

    it("matches 'Biologie cellulaire'", () => {
      expect(suggestIcon("Biologie cellulaire")).toBe("flask:#10b981");
    });

    it("matches 'Math avancées'", () => {
      expect(suggestIcon("Math avancées")).toBe("flask:#10b981");
    });
  });

  describe("geography patterns", () => {
    it("matches 'Capitales du monde' as globe", () => {
      expect(suggestIcon("Capitales du monde")).toBe("globe:#06b6d4");
    });

    it("matches 'Géographie'", () => {
      expect(suggestIcon("Géographie")).toBe("globe:#06b6d4");
    });

    it("matches 'Continents'", () => {
      expect(suggestIcon("Continents")).toBe("globe:#06b6d4");
    });
  });

  describe("sports patterns", () => {
    it("matches 'Sports olympiques'", () => {
      expect(suggestIcon("Sports olympiques")).toBe("trophy:#f59e0b");
    });

    it("matches 'Football rules'", () => {
      expect(suggestIcon("Football rules")).toBe("trophy:#f59e0b");
    });

    it("matches 'Athlètes célèbres'", () => {
      expect(suggestIcon("Athlètes célèbres")).toBe("trophy:#f59e0b");
    });
  });

  describe("art patterns", () => {
    it("matches 'Art moderne'", () => {
      expect(suggestIcon("Art moderne")).toBe("palette:#ec4899");
    });

    it("matches 'Peinture impressionniste'", () => {
      expect(suggestIcon("Peinture impressionniste")).toBe("palette:#ec4899");
    });

    it("matches 'Cinéma français' as art", () => {
      expect(suggestIcon("Cinéma français")).toBe("palette:#ec4899");
    });
  });

  describe("history patterns", () => {
    it("matches 'Histoire de France'", () => {
      expect(suggestIcon("Histoire de France")).toBe("book:#78716c");
    });

    it("matches 'World War II' as history", () => {
      expect(suggestIcon("World War II")).toBe("book:#78716c");
    });

    it("matches 'Dates importantes'", () => {
      expect(suggestIcon("Dates importantes")).toBe("book:#78716c");
    });
  });

  describe("health patterns", () => {
    it("matches 'Santé et nutrition'", () => {
      expect(suggestIcon("Santé et nutrition")).toBe("heart:#ef4444");
    });

    it("matches 'Médecine générale'", () => {
      expect(suggestIcon("Médecine générale")).toBe("heart:#ef4444");
    });

    it("matches 'Corps humain'", () => {
      expect(suggestIcon("Corps humain")).toBe("heart:#ef4444");
    });
  });

  describe("quiz patterns", () => {
    it("matches 'Quiz rapide'", () => {
      expect(suggestIcon("Quiz rapide")).toBe("lightning:#f97316");
    });

    it("matches 'Test de culture'", () => {
      expect(suggestIcon("Test de culture")).toBe("lightning:#f97316");
    });

    it("matches 'Flash cards'", () => {
      expect(suggestIcon("Flash cards")).toBe("lightning:#f97316");
    });
  });

  describe("default fallback", () => {
    it("returns star for unmatched names", () => {
      expect(suggestIcon("Ma liste perso")).toBe("star:#6b7280");
    });

    it("returns star for empty string", () => {
      expect(suggestIcon("")).toBe("star:#6b7280");
    });

    it("returns star for random text", () => {
      expect(suggestIcon("abc xyz 12345")).toBe("star:#6b7280");
    });
  });

  describe("case insensitivity", () => {
    it("matches uppercase", () => {
      expect(suggestIcon("DRAPEAUX")).toBe("flag:#ef4444");
    });

    it("matches mixed case", () => {
      expect(suggestIcon("AnGlAiS")).toBe("book:#3b82f6");
    });
  });

  describe("priority (first match wins)", () => {
    it("flag beats geography for 'pays' keyword", () => {
      // 'pays' matches the flag rule first
      expect(suggestIcon("Pays")).toBe("flag:#ef4444");
    });
  });
});
