/**
 * Génère un job TTS à partir du CSV de phrases.
 * Le worker (npm run dev) le traite automatiquement.
 *
 * Usage:
 *   npx tsx src/generate-from-csv.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CSV_PATH = resolve(
  process.cwd(),
  "storage/input/phrases_anglais_francais_corrigees_2_1100.csv"
);

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  const phrases: { textEn: string; textFr: string; label: string }[] = [];

  // Skip header (slide;anglais;français)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(";");
    if (parts.length !== 3) {
      console.warn(`[CSV] Ligne ${i + 1} ignorée : ${parts.length} parties`);
      continue;
    }

    phrases.push({
      label: parts[0].trim(),
      textEn: parts[1].trim(),
      textFr: parts[2].trim(),
    });
  }

  return phrases;
}

async function main() {
  console.log("[CSV] Lecture du fichier...");
  const content = readFileSync(CSV_PATH, "utf-8");
  const phrases = parseCSV(content);

  console.log(`[CSV] ${phrases.length} phrases parsées`);

  if (phrases.length === 0) {
    console.error("[CSV] Aucune phrase trouvée, aborting.");
    process.exit(1);
  }

  // Affiche un aperçu
  console.log(`[CSV] Premières 3 phrases :`);
  phrases.slice(0, 3).forEach((p) => {
    console.log(`  #${p.label}: "${p.textEn}" → "${p.textFr}"`);
  });
  console.log(`[CSV] Dernières 3 phrases :`);
  phrases.slice(-3).forEach((p) => {
    console.log(`  #${p.label}: "${p.textEn}" → "${p.textFr}"`);
  });

  console.log("");
  console.log("[CSV] Création du job TTS...");

  await prisma.$connect();

  const job = await prisma.ttsJob.create({
    data: {
      status: "pending",
      totalPhrases: phrases.length,
      phrases: phrases.map((p) => ({
        textEn: p.textEn,
        textFr: p.textFr,
        fileId: p.label, // numéro de slide pour nommer les fichiers
      })),
    },
  });

  console.log(`[CSV] Job créé : ${job.id}`);
  console.log(`[CSV] Total phrases : ${job.totalPhrases}`);
  console.log(`[CSV] Temps estimé : ~${Math.ceil((phrases.length * 1) / 60)} minutes`);
  console.log("");
  console.log(`[CSV] Surveiller avec : npx tsx src/poll-job.ts ${job.id}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
