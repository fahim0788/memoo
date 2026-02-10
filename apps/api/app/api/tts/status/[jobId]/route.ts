import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const job = await prisma.ttsJob.findUnique({
    where: { id: params.jobId },
    select: {
      id: true,
      status: true,
      totalPhrases: true,
      processedCount: true,
      errorMessage: true,
      resultUrls: true,
      createdAt: true,
      completedAt: true,
    },
  });

  if (!job) {
    return json({ error: "job not found" }, req, 404);
  }

  return json({ job }, req);
}
