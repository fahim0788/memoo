import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../_lib/cors";
import { requireAuth } from "../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { name, cards } = await req.json();
  if (!name || !Array.isArray(cards)) {
    return json({ error: "name and cards array required" }, req, 400);
  }

  for (const card of cards) {
    if (!card.question || !Array.isArray(card.answers) || card.answers.length === 0) {
      return json({ error: "each card must have a question and at least one answer" }, req, 400);
    }
  }

  const deck = await prisma.deck.create({
    data: {
      name,
      ownerId: auth.user.userId,
      cards: {
        create: cards.map((c: { question: string; answers: string[]; imageUrl?: string }) => ({
          question: c.question,
          answers: c.answers,
          imageUrl: c.imageUrl || null,
        })),
      },
    },
    include: { cards: { select: { id: true } } },
  });

  return json({ ok: true, deck: { id: deck.id, name: deck.name, cardCount: deck.cards.length } }, req);
}
