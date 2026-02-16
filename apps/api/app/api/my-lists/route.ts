import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../_lib/cors";
import { requireAuth } from "../../_lib/auth";
import { validateBody, AddListSchema } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const userDecks = await prisma.userDeck.findMany({
    where: { userId: auth.user.userId },
    include: {
      deck: { include: { cards: { select: { id: true } }, _count: { select: { chapters: true } } } },
    },
    orderBy: { position: "asc" },
  });

  const decks = userDecks.map(ud => ({
    id: ud.deck.id,
    name: ud.deck.name,
    cardCount: ud.deck.cards.length,
    chapterCount: ud.deck._count.chapters,
    isOwned: ud.deck.ownerId === auth.user.userId,
    icon: ud.icon ?? null,
    aiVerify: ud.deck.aiVerify,
  }));

  return json({ decks }, req);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = await validateBody(req, AddListSchema);
  if (parsed.error) return parsed.error;
  const { deckId, icon } = parsed.data;

  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) {
    return json({ error: "list not found" }, req, 404);
  }

  await prisma.userDeck.create({
    data: { userId: auth.user.userId, deckId, icon: icon || null },
  }).catch(() => {
    // Duplicate - ignore (skipDuplicates equivalent)
  });

  return json({ ok: true }, req);
}
