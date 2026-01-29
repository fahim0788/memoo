export function normalizeText(s: string): string {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(userAnswer: string, expectedAnswers: readonly string[]): boolean {
  const u = normalizeText(userAnswer);
  if (!u) return false;
  for (const exp of expectedAnswers) {
    const e = normalizeText(exp);
    if (!e) continue;
    if (u === e) return true;
    const words = e.split(" ").filter(Boolean);
    if (words.length >= 2 && words.every(w => u.includes(w))) return true;
  }
  return false;
}
