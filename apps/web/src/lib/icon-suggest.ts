/**
 * Suggestion automatique d'icône basée sur le nom du deck
 */

const RULES: [RegExp, string][] = [
  [/drapeau|flag|pays|countr/i, "flag:#ef4444"],
  [/anglais|english|espagnol|spanish|allemand|german|vocab|phrase|mot\b|word|langue|language/i, "book:#3b82f6"],
  [/musique|music|son\b|sound|instrument/i, "music:#8b5cf6"],
  [/science|chimie|chemistry|physique|physics|bio|math/i, "flask:#10b981"],
  [/g[eé]o|capital|continent|carte|map|monde/i, "globe:#06b6d4"],
  [/sport|athl[eè]t|football|tennis|rugby|olympi/i, "trophy:#f59e0b"],
  [/art\b|peinture|paint|cin[eé]ma|film|photo|dessin/i, "palette:#ec4899"],
  [/histoire|history|guerre|war|world\s*war|date|epoch/i, "book:#78716c"],
  [/fran[cç]ais|french/i, "book:#3b82f6"],
  [/sant[eé]|health|m[eé]decine|medic|corps|body/i, "heart:#ef4444"],
  [/quiz|test|exam|rapid|flash/i, "lightning:#f97316"],
];

export function suggestIcon(deckName: string): string {
  for (const [pattern, icon] of RULES) {
    if (pattern.test(deckName)) return icon;
  }
  return "star:#6b7280";
}
