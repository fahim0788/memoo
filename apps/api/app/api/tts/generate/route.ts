import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";
import { validateBody, GenerateTtsSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = await validateBody(req, GenerateTtsSchema);
  if (parsed.error) return parsed.error;
  const { deckId, phrases } = parsed.data;

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
