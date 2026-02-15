import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import OpenAI from "openai";
import { json, OPTIONS } from "../../../../_lib/cors";
import { requireAuth } from "../../../../_lib/auth";

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

  const { question, answer } = await req.json();

  if (!question || !answer) {
    return json({ error: "missing fields" }, req, 400);
  }

  const { cardId } = params;

  try {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return json({ error: "card not found" }, req, 404);

    // If distractors already exist, return them directly
    const existing = Array.isArray(card.distractors) ? (card.distractors as string[]) : [];
    if (existing.length > 0) {
      return json({ distractors: existing }, req);
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: `Tu es un générateur de QCM pour des flashcards éducatives.
On te donne une question et sa bonne réponse.
Génère exactement 3 mauvaises réponses (distracteurs) qui sont :
- Plausibles et réalistes (un étudiant pourrait hésiter)
- Du même type/format que la bonne réponse (même longueur approximative, même catégorie)
- Clairement fausses pour quelqu'un qui connaît le sujet

Réponds UNIQUEMENT avec les 3 distracteurs, un par ligne, sans numérotation ni ponctuation finale.`,
        },
        {
          role: "user",
          content: `Question : ${question}\nBonne réponse : ${answer}`,
        },
      ],
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const distractors = raw
      .split("\n")
      .map(line => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(line => line.length > 0)
      .slice(0, 3);

    if (distractors.length > 0) {
      await prisma.card.update({
        where: { id: cardId },
        data: { distractors },
      });
    }

    return json({ distractors }, req);
  } catch (err) {
    console.error("[Distractors] Error:", err);
    return json({ error: "distractor generation failed" }, req, 500);
  }
}
