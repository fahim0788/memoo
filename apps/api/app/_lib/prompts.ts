// ---------------------------------------------------------------------------
// AI Prompts & Model Configuration
// ---------------------------------------------------------------------------

export const AI_MODEL = "gpt-4o-mini";

// ---- Answer Evaluation ----

export const EVALUATE_CONFIG = {
  temperature: 0,
  max_tokens: 10,
} as const;

export const EVALUATE_SYSTEM_PROMPT = `Tu es un correcteur de flashcards. On te donne une question, la ou les réponse(s) de référence, et la réponse d'un utilisateur.
Réponds UNIQUEMENT "OUI" si la réponse utilisateur est correcte ou acceptablement équivalente.
Variantes acceptables (répondre OUI) :
- Synonymes et reformulations du même sens
- Variantes orthographiques, accents manquants
- Singulier/pluriel
- Tutoiement ↔ vouvoiement (te/vous, ton/votre, tu/vous, etc.)
- Masculin/féminin quand le sens reste identique
- Ordre des mots différent mais même sens
Réponds "NON" si la réponse est incorrecte, trop vague, ou incomplète.
Ne donne aucune explication.`;

export function evaluateUserPrompt(
  question: string,
  referenceAnswers: string[],
  userAnswer: string,
) {
  return `Question : ${question}\nRéponse(s) de référence : ${referenceAnswers.join(", ")}\nRéponse de l'utilisateur : ${userAnswer}`;
}

// ---- Distractor Generation (MCQ) ----

export const DISTRACTORS_CONFIG = {
  temperature: 0.7,
  max_tokens: 150,
} as const;

export const DISTRACTORS_SYSTEM_PROMPT = `Tu es un générateur de QCM pour des flashcards éducatives.
On te donne une question et sa bonne réponse.
Génère exactement 3 mauvaises réponses (distracteurs) qui sont :
- Plausibles et réalistes (un étudiant pourrait hésiter)
- Du même type/format que la bonne réponse (même longueur approximative, même catégorie)
- Clairement fausses pour quelqu'un qui connaît le sujet

Réponds UNIQUEMENT avec les 3 distracteurs, un par ligne, sans numérotation ni ponctuation finale.`;

export function distractorsUserPrompt(question: string, answer: string) {
  return `Question : ${question}\nBonne réponse : ${answer}`;
}

// ---- Fill-in-the-Blanks Generation ----

export const FILL_BLANKS_CONFIG = {
  temperature: 0.5,
  max_tokens: 300,
  response_format: { type: "json_object" } as const,
} as const;

export const FILL_BLANKS_SYSTEM_PROMPT = `Tu es un générateur d'exercices "texte à trous" pour flashcards éducatives.
On te donne une question, sa bonne réponse (une phrase), et le nombre de mots à masquer.
Choisis les N mots-clés les plus importants à masquer (noms, verbes, adjectifs porteurs de sens — PAS les articles, prépositions ou conjonctions).
Pour chaque mot masqué, génère exactement 2 distracteurs plausibles :
- Du même type grammatical que le mot correct
- Plausibles dans le contexte de la phrase
- Clairement faux pour quelqu'un qui connaît le sujet

Réponds UNIQUEMENT en JSON :
{ "blanks": [{ "index": <position 0-based du mot dans la phrase>, "word": "<mot exact tel qu'il apparaît>", "distractors": ["<d1>", "<d2>"] }] }`;

export function fillBlanksUserPrompt(question: string, answer: string, blankCount: number) {
  return `Question : ${question}\nRéponse : ${answer}\nNombre de trous : ${blankCount}`;
}

/** Compute the number of blanks based on answer word count */
export function computeBlankCount(answer: string): number {
  const wordCount = answer.trim().split(/\s+/).length;
  if (wordCount <= 5) return 1;
  if (wordCount <= 10) return 2;
  return 3;
}

// ---- Chapter Classification ----

export const CLASSIFY_CONFIG = {
  temperature: 0.3,
  max_tokens: 4096,
  response_format: { type: "json_object" } as const,
} as const;

export function classifySystemPrompt(deckName: string) {
  return `You are a classification assistant for a flashcard learning app.
Given a list of numbered flashcard items (question → answer) from a deck named "${deckName}",
group them into a FEW broad logical chapters/categories.
Use BOTH the question AND the answer to determine the correct category.

Rules:
- Create between 3 and 7 chapters MAXIMUM. Prefer fewer, larger chapters.
- Each chapter should contain at least 15-20 cards. Do NOT create small chapters with only a few cards.
- Merge similar or related topics into one chapter rather than splitting them.
- For geography/flags: group by continent (Europe, Asia, Africa, Americas, Oceania). Use the ANSWER (country name) to determine the continent.
- For vocabulary: group by broad theme (max 5-6 themes)
- Chapter names should be short (2-4 words)
- Every card must be assigned to exactly one chapter
- When in doubt, merge into a larger chapter rather than creating a new one

IMPORTANT: Return card numbers (not text) for compactness.
Return JSON: { "chapters": [{ "name": "Chapter Name", "description": "Brief description", "indices": [1, 2, 3, ...] }] }`;
}

export function classifyUserPrompt(count: number, cardList: string) {
  return `Classify these ${count} flashcard items into chapters:\n\n${cardList}`;
}
