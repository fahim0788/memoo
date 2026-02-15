import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, ResendCodeSchema } from "../../../_lib/validation";
import { generateCode, codeExpiresAt, sendVerificationEmail } from "../../../_lib/email";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 3, windowMs: 60 * 60_000, prefix: "resend-code" });
  if (limited) return limited;

  const parsed = await validateBody(req, ResendCodeSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return ok to avoid leaking user existence
  if (!user || user.emailVerified) {
    return json({ ok: true }, req);
  }

  const code = generateCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationCode: code, verificationCodeExpiresAt: codeExpiresAt(15) },
  });

  await sendVerificationEmail(email, code);

  return json({ ok: true }, req);
}
