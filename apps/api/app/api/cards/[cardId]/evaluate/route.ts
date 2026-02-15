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

  const { userAnswer, question, referenceAnswers } = await req.json();

  if (!userAnswer || !question || !Array.isArray(referenceAnswers) || referenceAnswers.length === 0) {
    return json({ error: "missing fields" }, req, 400);
  }

  const { cardId } = params;

  try {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return json({ error: "card not found" }, req, 404);

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content: `Tu es un correcteur de flashcards. On te donne une question, la ou les réponse(s) de référence, et la réponse d'un utilisateur.
Réponds UNIQUEMENT "OUI" si la réponse utilisateur est correcte ou acceptablement équivalente (synonyme, reformulation, variante orthographique, pluriel/singulier, langue différente du même mot).
Réponds "NON" si la réponse est incorrecte, trop vague, ou incomplète.
Ne donne aucune explication.`,
        },
        {
          role: "user",
          content: `Question : ${question}\nRéponse(s) de référence : ${referenceAnswers.join(", ")}\nRéponse de l'utilisateur : ${userAnswer}`,
        },
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
