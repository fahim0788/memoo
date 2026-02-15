import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, ResetPasswordSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "reset-password" });
  if (limited) return limited;

  const parsed = await validateBody(req, ResetPasswordSchema);
  if (parsed.error) return parsed.error;
  const { email, code, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !user.verificationCode ||
    user.verificationCode !== code ||
    !user.verificationCodeExpiresAt ||
    user.verificationCodeExpiresAt < new Date()
  ) {
    return json({ error: "invalid code" }, req, 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    },
  });

  return json({ ok: true }, req);
}
