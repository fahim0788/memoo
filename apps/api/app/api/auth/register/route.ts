import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { signToken } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const { email, password, firstName, lastName } = await req.json();

  if (!email || !password) {
    return json({ error: "email and password required" }, req, 400);
  }

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
