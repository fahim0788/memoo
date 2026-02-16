import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import OpenAI from "openai";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";
import {
  AI_MODEL,
  FILL_BLANKS_CONFIG,
  FILL_BLANKS_SYSTEM_PROMPT,
  fillBlanksUserPrompt,
  computeBlankCount,
} from "../../../../_lib/prompts";

export const dynamic = "force-dynamic";
export { OPTIONS };

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

type FillBlank = { index: number; word: string; distractors: string[] };

export async function POST(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  if (!process.env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY not configured" }, req, 500);
  }

  const { question, answer } = await req.json();

  if (!question || !answer) {
    return json({ error: "missing fields" }, req, 400);
  }

  const { cardId } = params;

  try {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return json({ error: "card not found" }, req, 404);

    // If fill-blanks already exist, return them directly
    const existing = card.fillBlanks as FillBlank[] | null;
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return json({ fillBlanks: existing }, req);
    }

    const blankCount = computeBlankCount(answer);

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      ...FILL_BLANKS_CONFIG,
      messages: [
        { role: "system", content: FILL_BLANKS_SYSTEM_PROMPT },
        { role: "user", content: fillBlanksUserPrompt(question, answer, blankCount) },
      ],
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    let fillBlanks: FillBlank[] = [];

    try {
      const parsed = JSON.parse(raw);
      if (parsed.blanks && Array.isArray(parsed.blanks)) {
        fillBlanks = parsed.blanks
          .filter(
            (b: any) =>
              typeof b.index === "number" &&
              typeof b.word === "string" &&
              Array.isArray(b.distractors),
          )
          .map((b: any) => ({
            index: b.index,
            word: b.word,
            distractors: b.distractors.filter((d: any) => typeof d === "string").slice(0, 2),
          }));
      }
    } catch {
      console.error("[FillBlanks] Failed to parse AI response:", raw);
      return json({ error: "fill-blanks generation failed" }, req, 500);
    }

    if (fillBlanks.length > 0) {
      await prisma.card.update({
        where: { id: cardId },
        data: { fillBlanks },
      });
    }

    return json({ fillBlanks }, req);
  } catch (err) {
    console.error("[FillBlanks] Error:", err);
    return json({ error: "fill-blanks generation failed" }, req, 500);
  }
}
