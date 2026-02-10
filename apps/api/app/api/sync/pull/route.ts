import { NextRequest } from "next/server";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  return json({ serverTime: Date.now() }, req);
}
