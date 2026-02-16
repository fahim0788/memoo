import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";
import { validateBody, CreateCardSchema } from "../../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId }, select: { ownerId: true } });
  if (!deck) return json({ error: "deck not found" }, req, 404);
  if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

  const parsed = await validateBody(req, CreateCardSchema);
  if (parsed.error) return parsed.error;
  const { question, answers, imageUrl, aiVerify } = parsed.data;

  const card = await prisma.card.create({
    data: { deckId: params.deckId, question, answers, imageUrl: imageUrl || null, ...(aiVerify !== undefined && { aiVerify }) },
    select: { id: true, question: true, answers: true, imageUrl: true },
  });

  return json({ ok: true, card: { ...card, answers: card.answers as string[] } }, req);
}
