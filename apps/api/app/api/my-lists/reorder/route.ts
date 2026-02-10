import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { deckIds } = await req.json();
  if (!Array.isArray(deckIds) || deckIds.length === 0) {
    return json({ error: "deckIds array required" }, req, 400);
  }

  const updatePromises = deckIds.map((deckId: string, index: number) =>
    prisma.userDeck.updateMany({
      where: { userId: auth.user.userId, deckId },
      data: { position: index },
    })
  );

  await Promise.all(updatePromises);

  return json({ ok: true }, req);
}
