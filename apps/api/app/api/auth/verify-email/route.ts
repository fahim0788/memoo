import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, VerifyEmailSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "verify-email" });
  if (limited) return limited;

  const parsed = await validateBody(req, VerifyEmailSchema);
  if (parsed.error) return parsed.error;
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return json({ error: "invalid code" }, req, 400);
  }

  if (user.emailVerified) {
    return json({ error: "already verified" }, req, 400);
  }

  if (
    !user.verificationCode ||
    user.verificationCode !== code ||
    !user.verificationCodeExpiresAt ||
    user.verificationCodeExpiresAt < new Date()
  ) {
    return json({ error: "invalid code" }, req, 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    },
  });

  // Track email verification success
  await prisma.event.create({
    data: {
      userId: user.id,
      sessionId: `server_${user.id}`,
      type: 'EMAIL_VERIFIED',
      category: 'AUTH',
      action: 'VERIFICATION_CODE_VERIFIED',
      status: 'success',
      metadata: { email: user.email },
    },
  }).catch(() => {});

  const token = signToken({ userId: user.id, email: user.email });

  return json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  }, req);
}
