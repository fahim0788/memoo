import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  });

  if (!user) {
    return json({ error: "user not found" }, req, 404);
  }

  return json({ user }, req);
}
