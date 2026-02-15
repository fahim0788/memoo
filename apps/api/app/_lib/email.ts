import crypto from "node:crypto";
import { BREVO_API_KEY } from "./config";

const SENDER = { name: "MemoList", email: "noreply@memoo.fr" };

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}

export function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function codeExpiresAt(minutes = 15): Date {
  return new Date(Date.now() + minutes * 60_000);
}

export async function sendVerificationEmail(to: string, code: string) {
  const subject = `${code} — Vérification de votre email MemoList`;
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 2rem;">
      <h2 style="margin-bottom: 0.5rem;">Bienvenue sur MemoList 👋</h2>
      <p>Voici votre code de vérification :</p>
      <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; text-align: center; padding: 1rem; background: #f1f5f9; border-radius: 0.75rem; margin: 1rem 0;">
        ${code}
      </div>
      <p style="color: #64748b; font-size: 0.875rem;">Ce code expire dans 15 minutes.</p>
    </div>
  `;

  if (!BREVO_API_KEY) {
    console.log(`[Email] Verification code for ${to}: ${code}`);
    return;
  }

  await sendEmail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const subject = `${code} — Réinitialisation de votre mot de passe MemoList`;
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 2rem;">
      <h2 style="margin-bottom: 0.5rem;">Réinitialisation du mot de passe</h2>
      <p>Voici votre code de réinitialisation :</p>
      <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; text-align: center; padding: 1rem; background: #f1f5f9; border-radius: 0.75rem; margin: 1rem 0;">
        ${code}
      </div>
      <p style="color: #64748b; font-size: 0.875rem;">Ce code expire dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    </div>
  `;

  if (!BREVO_API_KEY) {
    console.log(`[Email] Password reset code for ${to}: ${code}`);
    return;
  }

  await sendEmail(to, subject, html);
}
