import { z } from "zod";
import { NextRequest } from "next/server";
import { json } from "./cors";

/**
 * Parse and validate the JSON body of a request against a Zod schema.
 * Returns `{ data }` on success, or `{ error: NextResponse }` on failure.
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: ReturnType<typeof json> }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
      return { error: json({ error: `validation error: ${msg}` }, req, 400) };
    }
    return { error: json({ error: "invalid request body" }, req, 400) };
  }
}

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1, "password required"),
});

export const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6, "password must be at least 6 characters"),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export const AddListSchema = z.object({
  deckId: z.string().min(1, "deckId required"),
  icon: z.string().optional(),
});

export const ReorderListsSchema = z.object({
  deckIds: z.array(z.string().min(1)).min(1, "at least one deckId required"),
});

export const UpdateIconSchema = z.object({
  icon: z.string().min(1, "icon required"),
});

const CardInputSchema = z.object({
  question: z.string().min(1, "question required"),
  answers: z.array(z.string().min(1)).min(1, "at least one answer required"),
  imageUrl: z.string().optional().nullable(),
  aiVerify: z.boolean().optional().nullable(),
});

export const CreateDeckSchema = z.object({
  name: z.string().min(1, "name required").max(200),
  aiVerify: z.boolean().optional(),
  cards: z.array(CardInputSchema).min(1, "at least one card required"),
});

export const UpdateDeckSchema = z.object({
  name: z.string().min(1, "name required").max(200),
  aiVerify: z.boolean().optional(),
});

export const CreateCardSchema = CardInputSchema;
export const UpdateCardSchema = CardInputSchema;

export const PushReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      cardId: z.string().min(1),
      ok: z.boolean(),
      userAnswer: z.string().optional(),
      reviewedAt: z.number().positive().optional(),
    }),
  ).min(1, "at least one review required").max(1000),
});

export const EvaluateAnswerSchema = z.object({
  userAnswer: z.string().min(1, "userAnswer required"),
  question: z.string().min(1, "question required"),
  referenceAnswers: z.array(z.string().min(1)).min(1, "at least one reference answer required"),
});

export const GenerateDistractorsSchema = z.object({
  question: z.string().min(1, "question required"),
  answer: z.string().min(1, "answer required"),
});

export const VerifyEmailSchema = z.object({
  email: z.string().email().max(255),
  code: z.string().length(6, "code must be 6 digits"),
});

export const ResendCodeSchema = z.object({
  email: z.string().email().max(255),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email().max(255),
  code: z.string().length(6, "code must be 6 digits"),
  newPassword: z.string().min(6, "password must be at least 6 characters"),
});

export const GenerateTtsSchema = z.object({
  deckId: z.string().min(1, "deckId required"),
  phrases: z.array(
    z.object({
      textEn: z.string().min(1, "textEn required"),
      textFr: z.string().min(1, "textFr required"),
    }),
  ).min(1).max(200, "maximum 200 phrases"),
});
