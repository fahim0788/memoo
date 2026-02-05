/**
 * Script de test : insère un job TTS en pending dans la DB.
 * Le worker (npm run dev) le traite automatiquement.
 *
 * Usage:
 *   npx tsx src/test-job.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_PHRASES = [
  {
    textEn: "Hello, how are you?",
    textFr: "Bonjour, comment allez-vous ?",
  },
  {
    textEn: "Good morning, have a nice day.",
    textFr: "Bonjour, bonne journée.",
  },
];

async function main() {
  console.log("[Test] Connecting to database...");
  await prisma.$connect();

  // Créer un job avec un deckId factice (pas de FK en place)
  console.log("[Test] Creating TTS job...");
  const job = await prisma.ttsJob.create({
    data: {
      status: "pending",
      totalPhrases: TEST_PHRASES.length,
      phrases: TEST_PHRASES,
    },
  });

  console.log(`[Test] Job created: ${job.id}`);
  console.log(`[Test] Status: ${job.status}`);
  console.log(`[Test] Phrases: ${job.totalPhrases}`);
  console.log("");
  console.log("[Test] Le worker devrait le traiter dans quelques secondes...");
  console.log(`[Test] Surveiller avec: npx tsx src/poll-job.ts ${job.id}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
