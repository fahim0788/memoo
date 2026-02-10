import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const chapters = await prisma.chapter.findMany({
    where: { deckId: params.deckId },
    include: { cards: { select: { id: true } } },
    orderBy: { position: "asc" },
  });

  return json({
    chapters: chapters.map(ch => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      position: ch.position,
      cardCount: ch.cards.length,
    })),
  }, req);
}
