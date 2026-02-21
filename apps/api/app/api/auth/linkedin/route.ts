import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } from "../../../_lib/config";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "linkedin-auth" });
  if (limited) return limited;

  let body: { code?: string; redirectUri?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, req, 400);
  }

  const { code, redirectUri } = body;
  if (!code || !redirectUri) {
    return json({ error: "code and redirectUri required" }, req, 400);
  }

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return json({ error: "LinkedIn Login not configured" }, req, 500);
  }

  // Exchange authorization code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return json({ error: "invalid LinkedIn code" }, req, 401);
    }
    accessToken = tokenData.access_token;
  } catch {
    return json({ error: "LinkedIn token exchange failed" }, req, 401);
  }

  // Fetch user profile via OIDC userinfo endpoint
  let liData: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
  };
  try {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    liData = await profileRes.json();
    console.warn("[LinkedIn] userinfo response:", JSON.stringify(liData));
  } catch {
    return json({ error: "LinkedIn profile fetch failed" }, req, 401);
  }

  if (!liData?.email) {
    return json({ error: "LinkedIn email not available" }, req, 403);
  }

  if (liData.email_verified === false) {
    return json({ error: "LinkedIn email not verified" }, req, 403);
  }

  const { email, given_name, family_name } = liData;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!user.isActive) {
      return json({ error: "account disabled" }, req, 403);
    }
    if (!user.emailVerified || user.authProvider === "EMAIL") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          authProvider: "LINKEDIN",
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        email,
        firstName: given_name
          ? given_name.charAt(0).toUpperCase() + given_name.slice(1).toLowerCase()
          : "",
        lastName: family_name ?? "",
        password: null,
        authProvider: "LINKEDIN",
        emailVerified: true,
      },
    });
  }

  const token = signToken({ userId: user.id, email: user.email });

  await prisma.event.create({
    data: {
      userId: user.id,
      sessionId: `server_${user.id}`,
      type: "OAUTH_LOGIN_SUCCESS",
      category: "AUTH",
      action: "OAUTH_LOGIN",
      status: "success",
      metadata: {
        provider: "linkedin",
        email: user.email,
      },
    },
  }).catch(() => {});

  return json(
    {
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authProvider: user.authProvider,
      },
    },
    req
  );
}
