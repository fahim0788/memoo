import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";
import { validateBody, ReorderListsSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = await validateBody(req, ReorderListsSchema);
  if (parsed.error) return parsed.error;
  const { deckIds } = parsed.data;

  const updatePromises = deckIds.map((deckId: string, index: number) =>
    prisma.userDeck.updateMany({
      where: { userId: auth.user.userId, deckId },
      data: { position: index },
    })
  );

  await Promise.all(updatePromises);

  return json({ ok: true }, req);
}
