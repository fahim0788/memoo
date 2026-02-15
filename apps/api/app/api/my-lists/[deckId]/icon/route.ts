import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";
import { validateBody, UpdateIconSchema } from "../../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const parsed = await validateBody(req, UpdateIconSchema);
    if (parsed.error) return parsed.error;
    const { icon } = parsed.data;

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
