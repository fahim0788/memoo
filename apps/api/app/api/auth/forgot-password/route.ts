import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, ForgotPasswordSchema } from "../../../_lib/validation";
import { generateCode, codeExpiresAt, sendPasswordResetEmail } from "../../../_lib/email";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 5, windowMs: 60 * 60_000, prefix: "forgot-password" });
  if (limited) return limited;

  const parsed = await validateBody(req, ForgotPasswordSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;

  // Always return ok to avoid leaking user existence
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const code = generateCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationCodeExpiresAt: codeExpiresAt(15) },
    });
    await sendPasswordResetEmail(email, code);
  }

  return json({ ok: true }, req);
}
