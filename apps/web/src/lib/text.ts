export function normalizeText(s: string): string {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'")
    .replace(/[-]/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Articles & prepositions ignored during fuzzy matching */
const STOP_WORDS = new Set([
  // FR: articles, prépositions courantes
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux",
  // EN: articles, prepositions
  "the", "a", "an", "of",
]);

export function isCorrect(userAnswer: string, expectedAnswers: readonly string[]): boolean {
  const u = normalizeText(userAnswer);
  if (!u) return false;
  for (const exp of expectedAnswers) {
    const e = normalizeText(exp);
    if (!e) continue;
    if (u === e) return true;
    const words = e.split(" ").filter(Boolean);
    if (words.length >= 2) {
      // Keep only content words (skip articles/prepositions)
      const content = words.filter(w => !STOP_WORDS.has(w));
      // If all words are stop words, require them all
      const required = content.length > 0 ? content : words;
      if (required.every(w => u.includes(w))) return true;
    }
  }
  return false;
}
