import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { deckId, phrases } = await req.json();

  if (!deckId || !Array.isArray(phrases)) {
    return json({ error: "deckId and phrases array required" }, req, 400);
  }

  if (phrases.length === 0 || phrases.length > 200) {
    return json({ error: "phrases must be between 1 and 200 items" }, req, 400);
  }

  for (const phrase of phrases) {
    if (!phrase.textEn || !phrase.textFr) {
      return json({ error: "each phrase must have textEn and textFr" }, req, 400);
    }
  }

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: { ownerId: true },
  });

  if (!deck) {
    return json({ error: "deck not found" }, req, 404);
  }

  if (deck.ownerId !== auth.user.userId) {
    return json({ error: "unauthorized: you can only generate TTS for your own decks" }, req, 403);
  }

  const job = await prisma.ttsJob.create({
    data: {
      userId: auth.user.userId,
      deckId,
      status: "pending",
      totalPhrases: phrases.length,
      phrases,
    },
  });

  return json({ ok: true, jobId: job.id }, req, 202);
}
