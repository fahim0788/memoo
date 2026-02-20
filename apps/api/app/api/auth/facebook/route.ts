import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } from "../../../_lib/config";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "facebook-auth" });
  if (limited) return limited;

  let body: { accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, req, 400);
  }

  const { accessToken } = body;
  if (!accessToken) {
    return json({ error: "accessToken required" }, req, 400);
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return json({ error: "Facebook Login not configured" }, req, 500);
  }

  // Verify the token with Facebook Graph API (debug_token endpoint)
  let fbData;
  try {
    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`
    );
    const debugJson = await debugRes.json();

    if (!debugJson.data?.is_valid || debugJson.data.app_id !== FACEBOOK_APP_ID) {
      return json({ error: "invalid Facebook token" }, req, 401);
    }

    // Fetch user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${accessToken}`
    );
    fbData = await profileRes.json();
  } catch {
    return json({ error: "Facebook verification failed" }, req, 401);
  }

  if (!fbData || !fbData.email) {
    return json({ error: "Facebook email not available" }, req, 403);
  }

  const { email, first_name, last_name } = fbData;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!user.isActive) {
      return json({ error: "account disabled" }, req, 403);
    }
    // Link existing account
    if (!user.emailVerified || user.authProvider === "EMAIL") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          authProvider: "FACEBOOK",
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        email,
        firstName: first_name
          ? first_name.charAt(0).toUpperCase() + first_name.slice(1).toLowerCase()
          : "",
        lastName: last_name ?? "",
        password: null,
        authProvider: "FACEBOOK",
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
        provider: 'facebook',
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
