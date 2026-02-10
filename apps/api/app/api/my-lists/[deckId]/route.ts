import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function DELETE(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  await prisma.userDeck.deleteMany({
    where: { userId: auth.user.userId, deckId: params.deckId },
  });

  return json({ ok: true }, req);
}
