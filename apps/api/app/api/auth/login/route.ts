import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";
import { rateLimit } from "../../../_lib/rate-limit";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  // 10 attempts per IP per 15 minutes
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, prefix: "login" });
  if (limited) return limited;

  const { email, password } = await req.json();

  if (!email || !password) {
    return json({ error: "email and password required" }, req, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return json({ error: "invalid credentials" }, req, 401);
  }

  if (!user.isActive) {
    return json({ error: "account disabled" }, req, 403);
  }

  const token = signToken({ userId: user.id, email: user.email });

  return json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  }, req);
}
