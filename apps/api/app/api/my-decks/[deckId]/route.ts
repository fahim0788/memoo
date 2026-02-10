import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId }, select: { ownerId: true } });
  if (!deck) return json({ error: "deck not found" }, req, 404);
  if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

  const { name } = await req.json();
  if (!name) return json({ error: "name required" }, req, 400);

  await prisma.deck.update({ where: { id: params.deckId }, data: { name } });

  return json({ ok: true }, req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const deck = await prisma.deck.findUnique({
    where: { id: params.deckId },
    select: { ownerId: true },
  });

  if (!deck) {
    return json({ error: "deck not found" }, req, 404);
  }

  if (deck.ownerId !== auth.user.userId) {
    return json({ error: "unauthorized: you can only delete your own decks" }, req, 403);
  }

  await prisma.deck.delete({ where: { id: params.deckId } });

  return json({ ok: true }, req);
}
