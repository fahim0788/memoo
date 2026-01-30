import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Force dynamic rendering (pas de pre-rendering au build)
export const dynamic = "force-dynamic";

/* ============================================================================
   Prisma 7 – avec adaptateur PostgreSQL
============================================================================ */

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    if ((globalThis as any).prisma) {
      prisma = (globalThis as any).prisma;
    } else {
      // Prisma 7 nécessite un adaptateur pour la connexion directe
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

const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "";

/* ============================================================================
   Auth helper
============================================================================ */

function requireAuth(req: NextRequest): NextResponse | null {
  if (!AUTH_TOKEN) return null; // allow if unset (local dev)

  const token = req.headers.get("x-auth-token");
  if (token !== AUTH_TOKEN) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }
  return null;
}

/* ============================================================================
   Router (single entry point)
============================================================================ */

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------
  if (pathname === "/api/health") {
    return NextResponse.json({
      ok: true,
      time: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Sync pull
  // ---------------------------------------------------------------------------
  if (pathname === "/api/sync/pull") {
    const auth = requireAuth(req);
    if (auth) return auth;

    return NextResponse.json({
      ok: true,
      serverTime: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Decks (GET)
  // ---------------------------------------------------------------------------
  if (pathname === "/api/decks") {
    const auth = requireAuth(req);
    if (auth) return auth;

    const decks = await getPrisma().deck.findMany({
      include: { cards: true },
    });

    return NextResponse.json({ decks });
  }

  return NextResponse.json(
    { error: "not found" },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // ---------------------------------------------------------------------------
  // Create deck
  // ---------------------------------------------------------------------------
  if (pathname === "/api/decks") {
    const auth = requireAuth(req);
    if (auth) return auth;

    const body = await req.json();
    const name = body?.name ?? "Nouveau deck";

    const deck = await getPrisma().deck.create({
      data: { name },
    });

    return NextResponse.json({ deck });
  }

  // ---------------------------------------------------------------------------
  // Create card
  // /api/decks/:deckId/cards
  // ---------------------------------------------------------------------------
  const cardMatch = pathname.match(/^\/api\/decks\/([^/]+)\/cards$/);
  if (cardMatch) {
    const auth = requireAuth(req);
    if (auth) return auth;

    const deckId = cardMatch[1];
    const body = await req.json();

    const question = body?.question ?? "";
    const answer = body?.answer ?? "";

    if (!question || !answer) {
      return NextResponse.json(
        { error: "question and answer required" },
        { status: 400 }
      );
    }

    const card = await getPrisma().card.create({
      data: {
        deckId,
        question,
        answer,
      },
    });

    return NextResponse.json({ card });
  }

  // ---------------------------------------------------------------------------
  // Sync push
  // ---------------------------------------------------------------------------
  if (pathname === "/api/sync/push") {
    const auth = requireAuth(req);
    if (auth) return auth;

    const body = await req.json();
    const reviews = Array.isArray(body?.reviews) ? body.reviews : [];

    let created = 0;

    for (const r of reviews) {
      if (!r.cardId) continue;

      await getPrisma().review.create({
        data: {
          cardId: String(r.cardId),
          ok: Boolean(r.ok),
          userAnswer: String(r.userAnswer ?? ""),
        },
      });

      created++;
    }

    return NextResponse.json({
      ok: true,
      created,
      serverTime: Date.now(),
    });
  }

  return NextResponse.json(
    { error: "not found" },
    { status: 404 }
  );
}
