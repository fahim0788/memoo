import { NextRequest } from "next/server";
import { json, OPTIONS } from "../../_lib/cors";
import { sendTestEmail } from "../../_lib/email";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function POST(req: NextRequest) {
  const { to } = await req.json();
  if (!to || typeof to !== "string") {
    return json({ error: "Missing 'to' field" }, req, 400);
  }

  try {
    await sendTestEmail(to);
    return json({ ok: true, sent_to: to }, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ ok: false, error: message }, req, 500);
  }
}
