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

  const cards = await prisma.card.findMany({
    where: { deckId: params.deckId },
    select: { id: true, question: true, answers: true, distractors: true, aiVerify: true, audioUrlEn: true, audioUrlFr: true, imageUrl: true, chapterId: true },
    orderBy: { createdAt: "asc" },
  });

  return json({ cards: cards.map(c => ({ ...c, answers: c.answers as string[], distractors: c.distractors as string[] })) }, req);
}
