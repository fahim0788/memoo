import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, LoginSchema } from "../../../_lib/validation";
import { generateCode, codeExpiresAt, sendVerificationEmail } from "../../../_lib/email";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  // 10 attempts per IP per 15 minutes
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "login" });
  if (limited) return limited;

  const parsed = await validateBody(req, LoginSchema);
  if (parsed.error) return parsed.error;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Track failed login attempt (user not found)
    await prisma.event.create({
      data: {
        userId: null,
        sessionId: `server_login_failed_${email}`,
        type: 'LOGIN_FAILED',
        category: 'AUTH',
        action: 'INVALID_EMAIL',
        status: 'failed',
        metadata: { reason: 'user_not_found', email },
      },
    }).catch(() => {});
    return json({ error: "invalid credentials" }, req, 401);
  }

  // Google-only accounts have no password
  if (!user.password) {
    return json({ error: "use_google_signin" }, req, 400);
  }

  if (!(await bcrypt.compare(password, user.password))) {
    // Track failed login (wrong password)
    await prisma.event.create({
      data: {
        userId: user.id,
        sessionId: `server_${user.id}`,
        type: 'LOGIN_FAILED',
        category: 'AUTH',
        action: 'INVALID_PASSWORD',
        status: 'failed',
        metadata: { reason: 'wrong_password', email: user.email },
      },
    }).catch(() => {});
    return json({ error: "invalid credentials" }, req, 401);
  }

  if (!user.isActive) {
    // Track failed login (account disabled)
    await prisma.event.create({
      data: {
        userId: user.id,
        sessionId: `server_${user.id}`,
        type: 'LOGIN_FAILED',
        category: 'AUTH',
        action: 'ACCOUNT_DISABLED',
        status: 'failed',
        metadata: { reason: 'account_disabled', email: user.email },
      },
    }).catch(() => {});
    return json({ error: "account disabled" }, req, 403);
  }

  if (!user.emailVerified) {
    // Resend a fresh verification code
    const code = generateCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationCodeExpiresAt: codeExpiresAt(15) },
    });
    await sendVerificationEmail(email, code);

    // Track email verification required
    await prisma.event.create({
      data: {
        userId: user.id,
        sessionId: `server_${user.id}`,
        type: 'EMAIL_VERIFICATION_REQUIRED',
        category: 'AUTH',
        action: 'VERIFICATION_CODE_RESENT',
        status: 'pending',
        metadata: { email: user.email },
      },
    }).catch(() => {});

    return json({ error: "email_not_verified" }, req, 403);
  }

  const token = signToken({ userId: user.id, email: user.email });

  // Track successful login
  await prisma.event.create({
    data: {
      userId: user.id,
      sessionId: `server_${user.id}`,
      type: 'LOGIN_SUCCESS',
      category: 'AUTH',
      action: 'USER_LOGIN',
      status: 'success',
      metadata: {
        method: 'password',
        email: user.email,
      },
    },
  }).catch(() => {}); // Silently ignore tracking errors

  return json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  }, req);
}
