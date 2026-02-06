import "dotenv/config";
import { prisma } from "@memolist/db";
import { processTtsJob } from "./tts-processor.js";



/* ============================================================================
   Config
============================================================================ */

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);
const MAX_RETRIES = 3;

/* ============================================================================
   Job Processor
============================================================================ */

async function processNextJob(): Promise<boolean> {
  // Find oldest pending job
  const job = await prisma.ttsJob.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    return false; // No jobs to process
  }

  console.log(`[Worker] Processing job ${job.id} (${job.totalPhrases} phrases)`);

  try {
    // Mark as processing
    await prisma.ttsJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date() },
    });

    // Process the job (call OpenAI TTS)
    const resultUrls = await processTtsJob(job, prisma);

    // Mark as completed
    await prisma.ttsJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        resultUrls,
        processedCount: job.totalPhrases,
        completedAt: new Date(),
      },
    });

    console.log(`[Worker] Job ${job.id} completed successfully`);
    return true;
  } catch (error: any) {
    console.error(`[Worker] Job ${job.id} failed:`, error.message);

    // Mark as failed
    await prisma.ttsJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: error.message || "Unknown error",
        completedAt: new Date(),
      },
    });

    return true;
  }
}

/* ============================================================================
   Main Loop
============================================================================ */

async function main() {
  console.log("[Worker] Starting TTS worker...");
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`[Worker] OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Missing"}`);
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  // Test database connection
  try {
    await prisma.$connect();
    console.log("[Worker] Database connected");
  } catch (error) {
    console.error("[Worker] Failed to connect to database:", error);
    process.exit(1);
  }

  // Main polling loop
  while (true) {
    try {
      const processed = await processNextJob();

      if (!processed) {
        // No jobs to process, wait before next poll
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } else {
        // Job was processed, check for more immediately
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("[Worker] Unexpected error in main loop:", error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

/* ============================================================================
   Graceful Shutdown
============================================================================ */

process.on("SIGINT", async () => {
  console.log("\n[Worker] Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[Worker] Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

/* ============================================================================
   Start
============================================================================ */

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
