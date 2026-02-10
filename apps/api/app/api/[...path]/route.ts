import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Force dynamic rendering
export const dynamic = "force-dynamic";

/* ============================================================================
   Prisma - Utilise le package @memolist/db partagé
============================================================================ */

function getPrisma() {
  return prisma;
}

/* ============================================================================
   Env
============================================================================ */

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

/* ============================================================================
   CORS helpers (App Router compatible)
============================================================================ */

function withCors(res: NextResponse, origin?: string | null) {
  // Allow CORS for configured origin or localhost in development
  if (origin === CORS_ORIGIN || origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
    res.headers.set("Access-Control-Allow-Origin", origin || CORS_ORIGIN);
  }

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

function json(data: any, req: NextRequest, status = 200) {
  return withCors(
    NextResponse.json(data, { status }),
    req.headers.get("origin")
  );
}

/* ============================================================================
   OPTIONS (preflight)
============================================================================ */

export async function OPTIONS(req: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), req.headers.get("origin"));
}

/* ============================================================================
   Auth helpers
============================================================================ */

type JwtPayload = {
  userId: string;
  email: string;
};

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function getAuthUser(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  return verifyToken(authHeader.slice(7));
}

function requireAuth(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return { error: json({ error: "unauthorized" }, req, 401) };
  }
  return { user };
}

/* ============================================================================
   GET
============================================================================ */

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);

  if (pathname === "/api/health") {
    return json({ ok: true, time: Date.now() }, req);
  }

  if (pathname === "/api/auth/me") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const user = await getPrisma().user.findUnique({
      where: { id: auth.user.userId },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user) {
      return json({ error: "user not found" }, req, 404);
    }

    return json({ user }, req);
  }

  // GET /api/lists/:deckId/cards  (before /api/lists to avoid conflict)
  const cardsMatch = pathname.match(/^\/api\/lists\/([^/]+)\/cards$/);
  if (cardsMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const cards = await getPrisma().card.findMany({
      where: { deckId: cardsMatch[1] },
      select: { id: true, question: true, answers: true, audioUrlEn: true, audioUrlFr: true, imageUrl: true, chapterId: true },
      orderBy: { createdAt: "asc" },
    });

    return json({ cards: cards.map(c => ({ ...c, answers: c.answers as string[] })) }, req);
  }

  if (pathname === "/api/lists") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    // Get only public decks (ownerId = null) that user hasn't activated yet
    const decks = await getPrisma().deck.findMany({
      where: {
        ownerId: null,
        userDecks: { none: { userId: auth.user.userId } }
      },
      include: { cards: { select: { id: true } } },
      orderBy: { name: "asc" },
    });

    return json({
      decks: decks.map(d => ({ id: d.id, name: d.name, cardCount: d.cards.length, isOwned: false })),
    }, req);
  }

  if (pathname === "/api/my-lists") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const userDecks = await getPrisma().userDeck.findMany({
      where: { userId: auth.user.userId },
      include: {
        deck: { include: { cards: { select: { id: true } }, _count: { select: { chapters: true } } } },
      },
      orderBy: { position: "asc" },
    });

    const decks = userDecks.map(ud => ({
      id: ud.deck.id,
      name: ud.deck.name,
      cardCount: ud.deck.cards.length,
      chapterCount: ud.deck._count.chapters,
      isOwned: ud.deck.ownerId === auth.user.userId,
      icon: ud.icon ?? null,
    }));

    return json({ decks }, req);
  }

  if (pathname === "/api/my-decks/available") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    // Get user's personal decks that are NOT yet activated (no UserDeck entry)
    const personalDecks = await getPrisma().deck.findMany({
      where: {
        ownerId: auth.user.userId,
        userDecks: { none: { userId: auth.user.userId } }
      },
      include: { cards: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });

    return json({
      decks: personalDecks.map(d => ({
        id: d.id,
        name: d.name,
        cardCount: d.cards.length,
        isOwned: true,
      })),
    }, req);
  }

  if (pathname === "/api/sync/pull") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    return json({ serverTime: Date.now() }, req);
  }

  // GET /api/tts/status/:jobId
  const ttsStatusMatch = pathname.match(/^\/api\/tts\/status\/([^/]+)$/);
  if (ttsStatusMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const jobId = ttsStatusMatch[1];
    const job = await getPrisma().ttsJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        totalPhrases: true,
        processedCount: true,
        errorMessage: true,
        resultUrls: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return json({ error: "job not found" }, req, 404);
    }

    return json({ job }, req);
  }

  // GET /api/lists/:deckId/chapters
  const chaptersMatch = pathname.match(/^\/api\/lists\/([^/]+)\/chapters$/);
  if (chaptersMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const deckId = chaptersMatch[1];
    const chapters = await getPrisma().chapter.findMany({
      where: { deckId },
      include: { cards: { select: { id: true } } },
      orderBy: { position: "asc" },
    });

    return json({
      chapters: chapters.map(ch => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        position: ch.position,
        cardCount: ch.cards.length,
      })),
    }, req);
  }

  return json({ error: "not found" }, req, 404);
}

/* ============================================================================
   POST
============================================================================ */

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);

  if (pathname === "/api/auth/register") {
    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password) {
      return json({ error: "email and password required" }, req, 400);
    }

    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) {
      return json({ error: "email already registered" }, req, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await getPrisma().user.create({
      data: { email, password: hashedPassword, firstName: firstName ?? "", lastName: lastName ?? "" },
    });

    const token = signToken({ userId: user.id, email: user.email });

    return json(
      {
        ok: true,
        token,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      },
      req
    );
  }

  if (pathname === "/api/auth/login") {
    const { email, password } = await req.json();

    if (!email || !password) {
      return json({ error: "email and password required" }, req, 400);
    }

    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return json({ error: "invalid credentials" }, req, 401);
    }

    if (!user.isActive) {
      return json({ error: "account disabled" }, req, 403);
    }

    const token = signToken({ userId: user.id, email: user.email });

    return json(
      {
        ok: true,
        token,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      },
      req
    );
  }

  if (pathname === "/api/my-decks") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { name, cards } = await req.json();
    if (!name || !Array.isArray(cards)) {
      return json({ error: "name and cards array required" }, req, 400);
    }

    // Validate cards format
    for (const card of cards) {
      if (!card.question || !Array.isArray(card.answers) || card.answers.length === 0) {
        return json({ error: "each card must have a question and at least one answer" }, req, 400);
      }
    }

    // Create deck with cards (stays in "available" state until user adds it)
    const deck = await getPrisma().deck.create({
      data: {
        name,
        ownerId: auth.user.userId,
        cards: {
          create: cards.map((c: any) => ({
            question: c.question,
            answers: c.answers,
            imageUrl: c.imageUrl || null,
          })),
        },
      },
      include: { cards: { select: { id: true } } },
    });

    return json({ ok: true, deck: { id: deck.id, name: deck.name, cardCount: deck.cards.length } }, req);
  }

  if (pathname === "/api/my-lists") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { deckId, icon } = await req.json();
    if (!deckId) {
      return json({ error: "deckId required" }, req, 400);
    }

    const deck = await getPrisma().deck.findUnique({ where: { id: deckId } });
    if (!deck) {
      return json({ error: "list not found" }, req, 404);
    }

    await getPrisma().userDeck.create({
      data: { userId: auth.user.userId, deckId, icon: icon || null },
    }).catch(() => {
      // Duplicate - ignore (skipDuplicates equivalent)
    });

    return json({ ok: true }, req);
  }

  if (pathname === "/api/sync/push") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { reviews } = await req.json();
    if (!Array.isArray(reviews)) {
      return json({ error: "reviews array required" }, req, 400);
    }

    const result = await getPrisma().review.createMany({
      data: reviews.map((r: any) => ({
        cardId: r.cardId,
        ok: r.ok,
        userAnswer: r.userAnswer ?? "",
        userId: auth.user.userId,
        ...(r.reviewedAt && { reviewedAt: new Date(r.reviewedAt) }),
      })),
    });

    return json({ ok: true, created: result.count, serverTime: Date.now() }, req);
  }

  // POST /api/my-decks/:deckId/cards - Add a card to an owned deck
  const addCardMatch = pathname.match(/^\/api\/my-decks\/([^/]+)\/cards$/);
  if (addCardMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const deckId = addCardMatch[1];
    const deck = await getPrisma().deck.findUnique({ where: { id: deckId }, select: { ownerId: true } });
    if (!deck) return json({ error: "deck not found" }, req, 404);
    if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

    const { question, answers, imageUrl } = await req.json();
    if (!question || !Array.isArray(answers) || answers.length === 0) {
      return json({ error: "question and answers array required" }, req, 400);
    }

    const card = await getPrisma().card.create({
      data: { deckId, question, answers, imageUrl: imageUrl || null },
      select: { id: true, question: true, answers: true, imageUrl: true },
    });

    return json({ ok: true, card: { ...card, answers: card.answers as string[] } }, req);
  }

  // POST /api/tts/generate
  if (pathname === "/api/tts/generate") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { deckId, phrases } = await req.json();

    // Validate input
    if (!deckId || !Array.isArray(phrases)) {
      return json({ error: "deckId and phrases array required" }, req, 400);
    }

    if (phrases.length === 0 || phrases.length > 200) {
      return json({ error: "phrases must be between 1 and 200 items" }, req, 400);
    }

    // Validate phrases format: [{textEn: string, textFr: string, cardId?: string}]
    for (const phrase of phrases) {
      if (!phrase.textEn || !phrase.textFr) {
        return json({ error: "each phrase must have textEn and textFr" }, req, 400);
      }
    }

    // Verify deck exists and user owns it
    const deck = await getPrisma().deck.findUnique({
      where: { id: deckId },
      select: { ownerId: true },
    });

    if (!deck) {
      return json({ error: "deck not found" }, req, 404);
    }

    if (deck.ownerId !== auth.user.userId) {
      return json({ error: "unauthorized: you can only generate TTS for your own decks" }, req, 403);
    }

    // Create TTS job
    const job = await getPrisma().ttsJob.create({
      data: {
        userId: auth.user.userId,
        deckId,
        status: "pending",
        totalPhrases: phrases.length,
        phrases: phrases,
      },
    });

    return json({ ok: true, jobId: job.id }, req, 202); // 202 Accepted
  }

  // POST /api/lists/:deckId/classify - AI chapter clustering
  const classifyMatch = pathname.match(/^\/api\/lists\/([^/]+)\/classify$/);
  if (classifyMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const deckId = classifyMatch[1];
    try {

    // Verify user has access
    const userDeck = await getPrisma().userDeck.findFirst({
      where: { userId: auth.user.userId, deckId },
    });
    if (!userDeck) return json({ error: "deck not found or not subscribed" }, req, 404);

    const deck = await getPrisma().deck.findUnique({
      where: { id: deckId },
      select: { name: true },
    });

    const cards = await getPrisma().card.findMany({
      where: { deckId },
      select: { id: true, question: true, answers: true },
      orderBy: { createdAt: "asc" },
    });

    if (cards.length === 0) return json({ error: "deck has no cards" }, req, 400);

    // Batch cards (max 100 per OpenAI call to keep response compact)
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

      const completion = await openai.chat.completions.create({
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
          // Convert 1-based indices to actual card IDs for this batch
          for (const ch of parsed.chapters) {
            const batchIndices = (ch.indices ?? []) as number[];
            // Map indices to global card positions
            const globalIndices = batchIndices.map((idx: number) => idx - 1 + batchIdx * BATCH_SIZE);
            allChapters.push({ name: ch.name, description: ch.description, indices: globalIndices });
          }
        }
      } catch (parseErr) {
        console.error("[Classify] Failed to parse OpenAI response:", parseErr);
        // Continue with other batches
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
    await getPrisma().card.updateMany({ where: { deckId }, data: { chapterId: null } });
    await getPrisma().chapter.deleteMany({ where: { deckId } });

    // Create chapters and assign cards using indices
    const createdChapters = [];

    for (let i = 0; i < allChapters.length; i++) {
      const ch = allChapters[i];
      const chapter = await getPrisma().chapter.create({
        data: { deckId, name: ch.name, description: ch.description ?? null, position: i },
      });

      const matchedCardIds: string[] = [];
      for (const idx of ch.indices ?? []) {
        if (idx >= 0 && idx < cards.length) {
          matchedCardIds.push(cards[idx].id);
        }
      }

      if (matchedCardIds.length > 0) {
        await getPrisma().card.updateMany({
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
    const unmatchedCount = await getPrisma().card.count({ where: { deckId, chapterId: null } });
    if (unmatchedCount > 0) {
      const otherChapter = await getPrisma().chapter.create({
        data: { deckId, name: "Autres", description: "Cartes non classifiées", position: allChapters.length },
      });
      await getPrisma().card.updateMany({
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

  return json({ error: "not found" }, req, 404);
}

/* ============================================================================
   PUT
============================================================================ */

export async function PUT(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // PUT /api/my-decks/:deckId/cards/:cardId - Update a card
  const updateCardMatch = pathname.match(/^\/api\/my-decks\/([^/]+)\/cards\/([^/]+)$/);
  if (updateCardMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const [, deckId, cardId] = updateCardMatch;
    const deck = await getPrisma().deck.findUnique({ where: { id: deckId }, select: { ownerId: true } });
    if (!deck) return json({ error: "deck not found" }, req, 404);
    if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

    const { question, answers, imageUrl } = await req.json();
    if (!question || !Array.isArray(answers) || answers.length === 0) {
      return json({ error: "question and answers array required" }, req, 400);
    }

    const card = await getPrisma().card.update({
      where: { id: cardId },
      data: {
        question,
        answers,
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null })
      },
      select: { id: true, question: true, answers: true, imageUrl: true },
    });

    return json({ ok: true, card: { ...card, answers: card.answers as string[] } }, req);
  }

  // PUT /api/my-decks/:deckId - Rename a deck
  const updateDeckMatch = pathname.match(/^\/api\/my-decks\/([^/]+)$/);
  if (updateDeckMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const deckId = updateDeckMatch[1];
    const deck = await getPrisma().deck.findUnique({ where: { id: deckId }, select: { ownerId: true } });
    if (!deck) return json({ error: "deck not found" }, req, 404);
    if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

    const { name } = await req.json();
    if (!name) return json({ error: "name required" }, req, 400);

    await getPrisma().deck.update({ where: { id: deckId }, data: { name } });

    return json({ ok: true }, req);
  }

  // PUT /api/my-lists/:deckId/icon - Update icon for a subscribed list
  const iconMatch = pathname.match(/^\/api\/my-lists\/([^/]+)\/icon$/);
  if (iconMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    try {
      const { icon } = await req.json();
      if (!icon || typeof icon !== "string") {
        return json({ error: "icon string required" }, req, 400);
      }

      await getPrisma().userDeck.updateMany({
        where: { userId: auth.user.userId, deckId: iconMatch[1] },
        data: { icon },
      });

      return json({ ok: true }, req);
    } catch (err) {
      console.error("Failed to update icon:", err);
      return json({ error: "failed to update icon" }, req, 500);
    }
  }

  // PUT /api/my-lists/reorder - Reorder user's subscribed lists
  if (pathname === "/api/my-lists/reorder") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { deckIds } = await req.json();
    if (!Array.isArray(deckIds) || deckIds.length === 0) {
      return json({ error: "deckIds array required" }, req, 400);
    }

    // Update the position field for each subscription
    const updatePromises = deckIds.map((deckId, index) =>
      getPrisma().userDeck.updateMany({
        where: {
          userId: auth.user.userId,
          deckId: deckId
        },
        data: {
          position: index
        }
      })
    );

    await Promise.all(updatePromises);

    return json({ ok: true }, req);
  }

  return json({ error: "not found" }, req, 404);
}

/* ============================================================================
   DELETE
============================================================================ */

export async function DELETE(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // DELETE /api/my-decks/:deckId/cards/:cardId - Delete a card from owned deck
  const deleteCardMatch = pathname.match(/^\/api\/my-decks\/([^/]+)\/cards\/([^/]+)$/);
  if (deleteCardMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const [, deckId, cardId] = deleteCardMatch;
    const deck = await getPrisma().deck.findUnique({ where: { id: deckId }, select: { ownerId: true } });
    if (!deck) return json({ error: "deck not found" }, req, 404);
    if (deck.ownerId !== auth.user.userId) return json({ error: "unauthorized" }, req, 403);

    await getPrisma().card.delete({ where: { id: cardId } });

    return json({ ok: true }, req);
  }

  const myDeckMatch = pathname.match(/^\/api\/my-decks\/([^/]+)$/);
  if (myDeckMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const deckId = myDeckMatch[1];
    const deck = await getPrisma().deck.findUnique({
      where: { id: deckId },
      select: { ownerId: true },
    });

    if (!deck) {
      return json({ error: "deck not found" }, req, 404);
    }

    if (deck.ownerId !== auth.user.userId) {
      return json({ error: "unauthorized: you can only delete your own decks" }, req, 403);
    }

    // Delete deck (cascades to cards and userDecks due to schema)
    await getPrisma().deck.delete({ where: { id: deckId } });

    return json({ ok: true }, req);
  }

  const myListMatch = pathname.match(/^\/api\/my-lists\/([^/]+)$/);
  if (myListMatch) {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    await getPrisma().userDeck.deleteMany({
      where: { userId: auth.user.userId, deckId: myListMatch[1] },
    });

    return json({ ok: true }, req);
  }

  return json({ error: "not found" }, req, 404);
}