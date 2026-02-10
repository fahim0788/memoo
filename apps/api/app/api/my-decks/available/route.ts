import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const personalDecks = await prisma.deck.findMany({
    where: {
      ownerId: auth.user.userId,
      userDecks: { none: { userId: auth.user.userId } },
    },
    include: { cards: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return json({
    decks: personalDecks.map(d => ({
      id: d.id,
      name: d.name,
      cardCount: d.cards.length,
      isOwned: true,
    })),
  }, req);
}
