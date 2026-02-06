/**
 * Crée un deck avec les cartes à partir du CSV.
 * Génère aussi un fichier de mapping slideNumber → cardId pour associer les audioUrls.
 *
 * Usage:
 *   npx tsx src/create-deck-from-csv.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CSV_PATH = resolve(
  process.cwd(),
  "storage/input/phrases_anglais_francais_corrigees_2_1100.csv"
);

const DECK_NAME = "1100 Phrases Anglais-Français";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000/storage/tts";

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  const phrases: { slide: string; en: string; fr: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(";");
    if (parts.length !== 3) continue;

    phrases.push({
      slide: parts[0].trim(),
      en: parts[1].trim(),
      fr: parts[2].trim(),
    });
  }

  return phrases;
}

async function main() {
  console.log("[Deck] Lecture du CSV...");
  const content = readFileSync(CSV_PATH, "utf-8");
  const phrases = parseCSV(content);
  console.log(`[Deck] ${phrases.length} phrases parsées`);

  await prisma.$connect();

  // Créer le deck sans owner (public)
  console.log(`[Deck] Création du deck "${DECK_NAME}"...`);
  const deck = await prisma.deck.create({
    data: {
      name: DECK_NAME,
      ownerId: null, // Public deck
    },
  });
  console.log(`[Deck] Deck créé : ${deck.id}`);

  // Créer les cartes avec audioUrls
  console.log("[Deck] Création des cartes avec audioUrls...");
  const mapping: Record<string, { cardId: string; slide: string }> = {};

  for (const phrase of phrases) {
    const card = await prisma.card.create({
      data: {
        deckId: deck.id,
        question: phrase.en,
        answers: [phrase.fr],
        audioUrlEn: `${PUBLIC_BASE_URL}/${phrase.slide}_en.mp3`,
        audioUrlFr: `${PUBLIC_BASE_URL}/${phrase.slide}_fr.mp3`,
      },
    });

    mapping[phrase.slide] = { cardId: card.id, slide: phrase.slide };
  }

  // Sauvegarder le mapping pour référence
  const mappingPath = resolve(process.cwd(), "storage/output/slide-card-mapping.json");
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  console.log("");
  console.log("✅ Terminé !");
  console.log(`   Deck ID      : ${deck.id}`);
  console.log(`   Deck Name    : ${DECK_NAME}`);
  console.log(`   Total cartes : ${phrases.length}`);
  console.log(`   Mapping      : ${mappingPath}`);
  console.log("");
  console.log("Le deck est maintenant disponible dans l'UI.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
