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

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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

  if (pathname === "/api/decks") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const decks = await getPrisma().deck.findMany({ include: { cards: true } });
    return json({ decks }, req);
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

  if (pathname === "/api/decks") {
    const auth = requireAuth(req);
    if ("error" in auth) return auth.error;

    const { name } = await req.json();
    const deck = await getPrisma().deck.create({ data: { name: name ?? "Nouveau deck" } });

    return json({ deck }, req);
  }

  return json({ error: "not found" }, req, 404);
}