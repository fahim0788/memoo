import { NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { GOOGLE_CLIENT_ID } from "../../../_lib/config";

export const dynamic = "force-dynamic";
export { OPTIONS };

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

type GoogleProfile = {
  email: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
};

async function verifyIdToken(credential: string): Promise<GoogleProfile | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return null;
    return {
      email: payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      email_verified: payload.email_verified,
    };
  } catch {
    return null;
  }
}

async function verifyAccessToken(accessToken: string): Promise<GoogleProfile | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.email) return null;
    return {
      email: data.email,
      given_name: data.given_name,
      family_name: data.family_name,
      email_verified: data.email_verified,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "google-auth" });
  if (limited) return limited;

  let body: { credential?: string; accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, req, 400);
  }

  const { credential, accessToken } = body;
  if (!credential && !accessToken) {
    return json({ error: "credential or accessToken required" }, req, 400);
  }

  if (!GOOGLE_CLIENT_ID) {
    return json({ error: "Google Sign-In not configured" }, req, 500);
  }

  // Verify token (ID token or access token)
  const profile = credential
    ? await verifyIdToken(credential)
    : await verifyAccessToken(accessToken!);

  if (!profile) {
    return json({ error: "invalid Google token" }, req, 401);
  }

  if (!profile.email_verified) {
    return json({ error: "Google email not verified" }, req, 403);
  }

  const { email, given_name, family_name } = profile;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!user.isActive) {
      return json({ error: "account disabled" }, req, 403);
    }
    // Link existing account: mark as Google-verified
    if (!user.emailVerified || user.authProvider === "EMAIL") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          authProvider: "GOOGLE",
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
      });
    }
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        firstName: given_name
          ? given_name.charAt(0).toUpperCase() + given_name.slice(1).toLowerCase()
          : "",
        lastName: family_name ?? "",
        password: null,
        authProvider: "GOOGLE",
        emailVerified: true,
      },
    });
  }

  const token = signToken({ userId: user.id, email: user.email });

  // Track OAuth login success
  await prisma.event.create({
    data: {
      userId: user.id,
      sessionId: `server_${user.id}`,
      type: 'OAUTH_LOGIN_SUCCESS',
      category: 'AUTH',
      action: 'OAUTH_LOGIN',
      status: 'success',
      metadata: {
        provider: 'google',
        email: user.email,
      },
    },
  }).catch(() => {});

  return json({
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      authProvider: user.authProvider,
    },
  }, req);
}
