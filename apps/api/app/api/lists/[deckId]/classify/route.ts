import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import OpenAI from "openai";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const { deckId } = params;

  if (!process.env.OPENAI_API_KEY) {
    console.error("[Classify] OPENAI_API_KEY is not set");
    return json({ error: "OPENAI_API_KEY not configured on server" }, req, 500);
  }

  try {
    const userDeck = await prisma.userDeck.findFirst({
      where: { userId: auth.user.userId, deckId },
    });
    if (!userDeck) return json({ error: "deck not found or not subscribed" }, req, 404);

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { name: true },
    });

    const cards = await prisma.card.findMany({
      where: { deckId },
      select: { id: true, question: true, answers: true },
      orderBy: { createdAt: "asc" },
    });

    if (cards.length === 0) return json({ error: "deck has no cards" }, req, 400);

    const BATCH_SIZE = 100;
    const batches: typeof cards[] = [];
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      batches.push(cards.slice(i, i + BATCH_SIZE));
    }

    let allChapters: { name: string; description: string; indices: number[] }[] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const cardList = batch.map((c, i) => {
        const answers = Array.isArray(c.answers) ? (c.answers as string[]).slice(0, 2).join(", ") : "";
        return `${i + 1}. ${c.question} → ${answers}`;
      }).join("\n");

      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a classification assistant for a flashcard learning app.
Given a list of numbered flashcard items (question → answer) from a deck named "${deck?.name ?? "Unknown"}",
group them into a FEW broad logical chapters/categories.
Use BOTH the question AND the answer to determine the correct category.

Rules:
- Create between 3 and 7 chapters MAXIMUM. Prefer fewer, larger chapters.
- Each chapter should contain at least 15-20 cards. Do NOT create small chapters with only a few cards.
- Merge similar or related topics into one chapter rather than splitting them.
- For geography/flags: group by continent (Europe, Asia, Africa, Americas, Oceania). Use the ANSWER (country name) to determine the continent.
- For vocabulary: group by broad theme (max 5-6 themes)
- Chapter names should be short (2-4 words)
- Every card must be assigned to exactly one chapter
- When in doubt, merge into a larger chapter rather than creating a new one

IMPORTANT: Return card numbers (not text) for compactness.
Return JSON: { "chapters": [{ "name": "Chapter Name", "description": "Brief description", "indices": [1, 2, 3, ...] }] }`,
          },
          {
            role: "user",
            content: `Classify these ${batch.length} flashcard items into chapters:\n\n${cardList}`,
          },
        ],
      });

      try {
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
        if (parsed.chapters && Array.isArray(parsed.chapters)) {
          for (const ch of parsed.chapters) {
            const batchIndices = (ch.indices ?? []) as number[];
            const globalIndices = batchIndices.map((idx: number) => idx - 1 + batchIdx * BATCH_SIZE);
            allChapters.push({ name: ch.name, description: ch.description, indices: globalIndices });
          }
        }
      } catch (parseErr) {
        console.error("[Classify] Failed to parse OpenAI response:", parseErr);
      }
    }

    // Merge same-name chapters from multi-batch
    if (batches.length > 1) {
      const merged = new Map<string, { name: string; description: string; indices: number[] }>();
      for (const ch of allChapters) {
        const key = ch.name.toLowerCase().trim();
        if (merged.has(key)) {
          merged.get(key)!.indices.push(...(ch.indices ?? []));
        } else {
          merged.set(key, { name: ch.name, description: ch.description, indices: ch.indices ?? [] });
        }
      }
      allChapters = Array.from(merged.values());
    }

    // Idempotent: clear existing chapters
    await prisma.card.updateMany({ where: { deckId }, data: { chapterId: null } });
    await prisma.chapter.deleteMany({ where: { deckId } });

    const createdChapters = [];

    for (let i = 0; i < allChapters.length; i++) {
      const ch = allChapters[i];
      const chapter = await prisma.chapter.create({
        data: { deckId, name: ch.name, description: ch.description ?? null, position: i },
      });

      const matchedCardIds: string[] = [];
      for (const idx of ch.indices ?? []) {
        if (idx >= 0 && idx < cards.length) {
          matchedCardIds.push(cards[idx].id);
        }
      }

      if (matchedCardIds.length > 0) {
        await prisma.card.updateMany({
          where: { id: { in: matchedCardIds } },
          data: { chapterId: chapter.id },
        });
      }

      createdChapters.push({
        id: chapter.id, name: chapter.name, description: chapter.description,
        position: chapter.position, cardCount: matchedCardIds.length,
      });
    }

    // Unmatched cards -> "Autres" chapter
    const unmatchedCount = await prisma.card.count({ where: { deckId, chapterId: null } });
    if (unmatchedCount > 0) {
      const otherChapter = await prisma.chapter.create({
        data: { deckId, name: "Autres", description: "Cartes non classifiées", position: allChapters.length },
      });
      await prisma.card.updateMany({
        where: { deckId, chapterId: null },
        data: { chapterId: otherChapter.id },
      });
      createdChapters.push({
        id: otherChapter.id, name: otherChapter.name, description: otherChapter.description,
        position: otherChapter.position, cardCount: unmatchedCount,
      });
    }

    return json({ ok: true, chapters: createdChapters }, req);
  } catch (err) {
    console.error("[Classify] Error:", err);
    return json({ error: "classification failed" }, req, 500);
  }
}
