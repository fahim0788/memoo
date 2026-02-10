import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

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

  const { question, answers, imageUrl } = await req.json();
  if (!question || !Array.isArray(answers) || answers.length === 0) {
    return json({ error: "question and answers array required" }, req, 400);
  }

  const card = await prisma.card.create({
    data: { deckId: params.deckId, question, answers, imageUrl: imageUrl || null },
    select: { id: true, question: true, answers: true, imageUrl: true },
  });

  return json({ ok: true, card: { ...card, answers: card.answers as string[] } }, req);
}
