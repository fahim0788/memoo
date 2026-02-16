import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";
import { validateBody, UpdateDeckSchema } from "../../../_lib/validation";

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

  const parsed = await validateBody(req, UpdateDeckSchema);
  if (parsed.error) return parsed.error;
  const { name, aiVerify, allowedModes } = parsed.data;

  await prisma.deck.update({
    where: { id: params.deckId },
    data: {
      name,
      ...(aiVerify !== undefined && { aiVerify }),
      ...(allowedModes !== undefined && { allowedModes }),
    },
  });

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
