import { NextRequest } from "next/server";
import { json, OPTIONS } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  return json({ ok: true, time: Date.now() }, req);
}
