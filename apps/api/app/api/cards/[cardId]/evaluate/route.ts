import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import OpenAI from "openai";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";
import { validateBody, EvaluateAnswerSchema } from "../../../../_lib/validation";
import { AI_MODEL, EVALUATE_CONFIG, EVALUATE_SYSTEM_PROMPT, evaluateUserPrompt } from "../../../../_lib/prompts";

export const dynamic = "force-dynamic";
export { OPTIONS };

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  if (!process.env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY not configured" }, req, 500);
  }

  const parsed = await validateBody(req, EvaluateAnswerSchema);
  if (parsed.error) return parsed.error;
  const { userAnswer, question, referenceAnswers } = parsed.data;

  const { cardId } = params;

  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { deck: { select: { aiVerify: true } } },
    });
    if (!card) return json({ error: "card not found" }, req, 404);

    const shouldAiVerify = card.aiVerify ?? card.deck.aiVerify;
    if (!shouldAiVerify) {
      return json({ acceptable: false, skipped: true }, req);
    }

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      ...EVALUATE_CONFIG,
      messages: [
        { role: "system", content: EVALUATE_SYSTEM_PROMPT },
        { role: "user", content: evaluateUserPrompt(question, referenceAnswers, userAnswer) },
      ],
    });

    const aiResponse = (completion.choices[0]?.message?.content ?? "").trim().toUpperCase();
    const acceptable = aiResponse.startsWith("OUI") || aiResponse.startsWith("YES");

    if (acceptable) {
      const currentAnswers = Array.isArray(card.answers) ? (card.answers as string[]) : [];
      const normalizedNew = userAnswer.trim().toLowerCase();
      const alreadyExists = currentAnswers.some(
        (a: string) => a.trim().toLowerCase() === normalizedNew
      );
      if (!alreadyExists) {
        await prisma.card.update({
          where: { id: cardId },
          data: { answers: [...currentAnswers, userAnswer.trim()] },
        });
      }
    }

    return json({ acceptable }, req);
  } catch (err) {
    console.error("[Evaluate] Error:", err);
    return json({ error: "evaluation failed" }, req, 500);
  }
}
