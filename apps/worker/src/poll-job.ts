/**
 * Script de surveillance : poll le statut d'un job TTS.
 *
 * Usage:
 *   npx tsx src/poll-job.ts <jobId>
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: npx tsx src/poll-job.ts <jobId>");
  process.exit(1);
}

async function main() {
  await prisma.$connect();

  console.log(`[Poll] Surveilling job ${jobId}...\n`);

  while (true) {
    const job = await prisma.ttsJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.error("[Poll] Job not found");
      process.exit(1);
    }

    const now = new Date().toLocaleTimeString();
    console.log(
      `[${now}] status=${job.status} | progression=${job.processedCount}/${job.totalPhrases}`
    );

    if (job.status === "completed") {
      console.log("\n✅ Job completed!");
      console.log("URLs générées :");
      console.log(JSON.stringify(job.resultUrls, null, 2));
      break;
    }

    if (job.status === "failed") {
      console.log("\n❌ Job failed!");
      console.log("Erreur:", job.errorMessage);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
