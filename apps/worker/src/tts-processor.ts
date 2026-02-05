import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/* ============================================================================
   Config
============================================================================ */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TTS_MODEL = "gpt-4o-mini-tts";
const VOICE_EN = "alloy"; // Clear, neutral voice for English
const VOICE_FR = "shimmer"; // Voice française

// Storage config
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local"; // local | s3
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || "./storage/tts";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000/storage/tts";

// Rate limiting
const DELAY_BETWEEN_REQUESTS_MS = 500; // Avoid hitting rate limits

/* ============================================================================
   Storage Helpers
============================================================================ */

async function ensureStorageDir() {
  if (STORAGE_TYPE === "local") {
    if (!existsSync(LOCAL_STORAGE_PATH)) {
      await mkdir(LOCAL_STORAGE_PATH, { recursive: true });
      console.log(`[TTS] Created storage directory: ${LOCAL_STORAGE_PATH}`);
    }
  }
}

async function saveAudioFile(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<string> {
  if (STORAGE_TYPE === "s3") {
    // TODO: Implement S3 upload
    throw new Error("S3 storage not yet implemented");
  }

  // Local filesystem storage
  const filePath = path.join(LOCAL_STORAGE_PATH, filename);
  await writeFile(filePath, Buffer.from(audioBuffer));

  // Return public URL
  return `${PUBLIC_BASE_URL}/${filename}`;
}

/* ============================================================================
   TTS Generation with Retry Logic
============================================================================ */

async function generateAudio(
  text: string,
  voice: "alloy" | "shimmer",
  lang: "en" | "fr",
  retries = 3
): Promise<ArrayBuffer> {
  const instructions =
    lang === "fr"
      ? "Parle avec un accent français natif et un ton pédagogique."
      : "Speak with a native English accent and an instructional tone.";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice,
        input: text,
        instructions,
      } as any);

      return await response.arrayBuffer();
    } catch (error: any) {
      if (attempt === retries) {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      }

      // Handle rate limiting with exponential backoff
      if (error?.status === 429) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(
          `[TTS] Rate limited, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        console.warn(
          `[TTS] Request failed, retrying (attempt ${attempt}/${retries}):`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error("Failed to generate audio");
}

/* ============================================================================
   Job Processor
============================================================================ */

export async function processTtsJob(
  job: any,
  prisma: PrismaClient
): Promise<any[]> {
  await ensureStorageDir();

  const phrases = job.phrases as Array<{
    textEn: string;
    textFr: string;
    cardId?: string;
  }>;

  const results: Array<{
    cardId?: string;
    audioUrlEn: string;
    audioUrlFr: string;
  }> = [];

  let processedCount = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const phraseId = phrase.fileId || phrase.cardId || `${job.id}_${i}`;

    console.log(
      `[TTS] Processing phrase ${i + 1}/${phrases.length}: ${phraseId}`
    );

    try {
      // Generate English audio
      const audioEn = await generateAudio(phrase.textEn, VOICE_EN, "en");
      const urlEn = await saveAudioFile(audioEn, `${phraseId}_en.mp3`);

      // Delay to avoid rate limiting
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS)
      );

      // Generate French audio
      const audioFr = await generateAudio(phrase.textFr, VOICE_FR, "fr");
      const urlFr = await saveAudioFile(audioFr, `${phraseId}_fr.mp3`);

      // Delay before next phrase
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS)
      );

      // Store result
      results.push({
        cardId: phrase.cardId,
        audioUrlEn: urlEn,
        audioUrlFr: urlFr,
      });

      // Update card only if cardId is a real cuid (not a file label)
      if (phrase.cardId && phrase.cardId.startsWith("c") && phrase.cardId.length > 10) {
        await prisma.card.update({
          where: { id: phrase.cardId },
          data: {
            audioUrlEn: urlEn,
            audioUrlFr: urlFr,
          },
        });
      }

      processedCount++;

      // Update job progress
      await prisma.ttsJob.update({
        where: { id: job.id },
        data: { processedCount },
      });

      console.log(
        `[TTS] ✓ Generated audio for phrase ${i + 1}/${phrases.length}`
      );
    } catch (error: any) {
      console.error(`[TTS] Failed to process phrase ${phraseId}:`, error.message);
      throw new Error(
        `Failed to process phrase ${i + 1}/${phrases.length}: ${error.message}`
      );
    }
  }

  console.log(`[TTS] Successfully processed ${results.length} phrases`);
  return results;
}
