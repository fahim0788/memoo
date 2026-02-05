import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/* ============================================================================
   Prisma
============================================================================ */

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    if ((globalThis as any).prisma) {
      prisma = (globalThis as any).prisma;
    } else {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });

      if (process.env.NODE_ENV !== "production") {
        (globalThis as any).prisma = prisma;
      }
    }
  }
  return prisma;
}

/* ============================================================================
   Env
============================================================================ */

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3001";

/* ============================================================================
   CORS helpers (App Router compatible)
============================================================================ */

function withCors(res: NextResponse, origin?: string | null) {
  if (origin === CORS_ORIGIN) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
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
      select: { id: true, question: true, answers: true },
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
        deck: { include: { cards: { select: { id: true } } } },
      },
    });

    const decks = userDecks.map(ud => ({
      id: ud.deck.id,
      name: ud.deck.name,
      cardCount: ud.deck.cards.length,
      isOwned: ud.deck.ownerId === auth.user.userId,
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

    const { deckId } = await req.json();
    if (!deckId) {
      return json({ error: "deckId required" }, req, 400);
    }

    const deck = await getPrisma().deck.findUnique({ where: { id: deckId } });
    if (!deck) {
      return json({ error: "list not found" }, req, 404);
    }

    await getPrisma().userDeck.createMany({
      data: [{ userId: auth.user.userId, deckId }],
      skipDuplicates: true,
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

  return json({ error: "not found" }, req, 404);
}

/* ============================================================================
   DELETE
============================================================================ */

export async function DELETE(req: NextRequest) {
  const { pathname } = new URL(req.url);

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