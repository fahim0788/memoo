import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../_lib/cors";
import { requireAuth } from "../../_lib/auth";
import { validateBody, CreateDeckSchema } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = await validateBody(req, CreateDeckSchema);
  if (parsed.error) return parsed.error;
  const { name, aiVerify, cards } = parsed.data;

  const deck = await prisma.deck.create({
    data: {
      name,
      ownerId: auth.user.userId,
      ...(aiVerify !== undefined && { aiVerify }),
      cards: {
        create: cards.map((c: { question: string; answers: string[]; imageUrl?: string; aiVerify?: boolean | null }) => ({
          question: c.question,
          answers: c.answers,
          imageUrl: c.imageUrl || null,
          ...(c.aiVerify !== undefined && { aiVerify: c.aiVerify }),
        })),
      },
    },
    include: { cards: { select: { id: true } } },
  });

  return json({ ok: true, deck: { id: deck.id, name: deck.name, cardCount: deck.cards.length } }, req);
}
