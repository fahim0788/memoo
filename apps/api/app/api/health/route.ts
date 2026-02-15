import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, db: true, time: Date.now() }, req);
  } catch {
    return json({ ok: false, db: false, error: "database unreachable", time: Date.now() }, req, 503);
  }
}
