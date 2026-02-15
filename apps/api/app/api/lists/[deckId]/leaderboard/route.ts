import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

type UserStats = {
  userId: string;
  firstName: string;
  totalReviews: bigint;
  successCount: bigint;
  uniqueCards: bigint;
  activeDays: bigint;
  firstReview: Date;
  lastReview: Date;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { deckId } = params;

  // Verify deck is public (ownerId = null)
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: { ownerId: true },
  });

  if (!deck) return json({ error: "deck not found" }, req, 404);
  if (deck.ownerId !== null) return json({ error: "leaderboard only available for public decks" }, req, 403);

  // Total cards in deck
  const totalCards = await prisma.card.count({ where: { deckId } });
  if (totalCards === 0) return json({ leaderboard: [], currentUser: null }, req);

  // Aggregate reviews per user for this deck
  const userStats = await prisma.$queryRaw<UserStats[]>`
    SELECT
      r."userId",
      u."firstName",
      COUNT(*)::bigint AS "totalReviews",
      SUM(CASE WHEN r.ok THEN 1 ELSE 0 END)::bigint AS "successCount",
      COUNT(DISTINCT r."cardId")::bigint AS "uniqueCards",
      COUNT(DISTINCT DATE(r."reviewedAt"))::bigint AS "activeDays",
      MIN(r."reviewedAt") AS "firstReview",
      MAX(r."reviewedAt") AS "lastReview"
    FROM "Review" r
    JOIN "Card" c ON r."cardId" = c.id
    JOIN "User" u ON r."userId" = u.id
    WHERE c."deckId" = ${deckId}
      AND r."userId" IS NOT NULL
    GROUP BY r."userId", u."firstName"
  `;

  if (userStats.length === 0) return json({ leaderboard: [], currentUser: null }, req);

  // For mastery: count cards with >50% success rate per user
  const masteryStats = await prisma.$queryRaw<{ userId: string; masteredCards: bigint }[]>`
    SELECT sub."userId", COUNT(*)::bigint AS "masteredCards"
    FROM (
      SELECT r."userId", r."cardId"
      FROM "Review" r
      JOIN "Card" c ON r."cardId" = c.id
      WHERE c."deckId" = ${deckId}
        AND r."userId" IS NOT NULL
      GROUP BY r."userId", r."cardId"
      HAVING SUM(CASE WHEN r.ok THEN 1.0 ELSE 0.0 END) / COUNT(*) > 0.5
    ) sub
    GROUP BY sub."userId"
  `;

  const masteryCountByUser = new Map<string, number>();
  for (const row of masteryStats) {
    masteryCountByUser.set(row.userId, Number(row.masteredCards));
  }

  const now = Date.now();

  // Compute composite score for each user
  const leaderboard = userStats.map((u) => {
    const total = Number(u.totalReviews);
    const success = Number(u.successCount);
    const activeDays = Number(u.activeDays);
    const firstReviewMs = new Date(u.firstReview).getTime();
    const daysSinceFirst = Math.max(1, Math.ceil((now - firstReviewMs) / (1000 * 60 * 60 * 24)));

    // Success rate (0-1)
    const successRate = total > 0 ? success / total : 0;

    // Mastery rate (0-1)
    const mastered = masteryCountByUser.get(u.userId) ?? 0;
    const masteryRate = totalCards > 0 ? Math.min(mastered / totalCards, 1) : 0;

    // Consistency rate (0-1, capped)
    const consistencyRate = Math.min(activeDays / daysSinceFirst, 1);

    // Volume rate (0-1): encourages ~3 reviews per card
    const volumeRate = Math.min(total / (totalCards * 3), 1);

    // Composite score (0-100)
    const score = Math.round(
      successRate * 40 + masteryRate * 30 + consistencyRate * 20 + volumeRate * 10
    );

    return {
      userId: u.userId,
      firstName: u.firstName,
      score,
      successRate: Math.round(successRate * 100),
      totalReviews: total,
    };
  });

  // Sort by score desc, then totalReviews desc as tiebreaker
  leaderboard.sort((a, b) => b.score - a.score || b.totalReviews - a.totalReviews);

  // Add ranks
  const ranked = leaderboard.map((entry, i) => ({
    rank: i + 1,
    ...entry,
  }));

  // Find current user
  const currentUser = ranked.find((e) => e.userId === auth.user.userId) ?? null;

  // Remove userId from response (privacy)
  const sanitized = ranked.map(({ userId, ...rest }) => rest);

  return json({ leaderboard: sanitized, currentUser: currentUser ? { rank: currentUser.rank, score: currentUser.score, successRate: currentUser.successRate } : null }, req);
}
