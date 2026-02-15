import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";
import { validateBody, RegisterSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  // 5 registrations per IP per hour
  const limited = rateLimit(req, { maxRequests: 5, windowMs: 60 * 60_000, prefix: "register" });
  if (limited) return limited;

  const parsed = await validateBody(req, RegisterSchema);
  if (parsed.error) return parsed.error;
  const { email, password, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return json({ error: "email already registered" }, req, 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, firstName: firstName ?? "", lastName: lastName ?? "" },
  });

  const token = signToken({ userId: user.id, email: user.email });

  return json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  }, req);
}
