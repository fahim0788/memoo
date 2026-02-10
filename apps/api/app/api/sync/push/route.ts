import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { reviews } = await req.json();
  if (!Array.isArray(reviews)) {
    return json({ error: "reviews array required" }, req, 400);
  }

  const result = await prisma.review.createMany({
    data: reviews.map((r: { cardId: string; ok: boolean; userAnswer?: string; reviewedAt?: number }) => ({
      cardId: r.cardId,
      ok: r.ok,
      userAnswer: r.userAnswer ?? "",
      userId: auth.user.userId,
      ...(r.reviewedAt && { reviewedAt: new Date(r.reviewedAt) }),
    })),
  });

  return json({ ok: true, created: result.count, serverTime: Date.now() }, req);
}
