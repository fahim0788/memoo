import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { icon } = await req.json();
    if (!icon || typeof icon !== "string") {
      return json({ error: "icon string required" }, req, 400);
    }

    await prisma.userDeck.updateMany({
      where: { userId: auth.user.userId, deckId: params.deckId },
      data: { icon },
    });

    return json({ ok: true }, req);
  } catch (err) {
    console.error("Failed to update icon:", err);
    return json({ error: "failed to update icon" }, req, 500);
  }
}
