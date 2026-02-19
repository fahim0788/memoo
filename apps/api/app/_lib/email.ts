import crypto from "node:crypto";
import { APP_URL, BREVO_API_KEY } from "./config";

const SENDER = { name: "Memoo", email: "noreply@memoo.fr" };

const LOGO_URL = `${APP_URL}/logo-memoo-white.png`;

// ---------------------------------------------------------------------------
// Branded email layout
// ---------------------------------------------------------------------------
function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- HEADER -->
  <tr>
    <td style="background:#0b0f17;padding:20px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="Memoo" width="34" height="34" style="display:inline-block;vertical-align:middle;border:0;">
      <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Memoo</span>
    </td>
  </tr>
  <!-- BODY -->
  <tr>
    <td style="padding:28px 24px 12px;">
      ${body}
    </td>
  </tr>
  <!-- FOOTER -->
  <tr>
    <td style="padding:16px 24px 24px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
        Apprends par r&eacute;p&eacute;tition espac&eacute;e<br>
        <a href="${APP_URL}" style="color:#0ea5e9;text-decoration:none;">memoo.fr</a>
        &nbsp;&middot;&nbsp; &copy; 2026 Memoo
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="font-size:28px;font-weight:700;letter-spacing:8px;text-align:center;padding:14px 16px;background:#f1f5f9;border-radius:10px;margin:16px 0;color:#0ea5e9;">${code}</div>`;
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function codeExpiresAt(minutes = 15): Date {
  return new Date(Date.now() + minutes * 60_000);
}

// ---------------------------------------------------------------------------
// Transactional emails
// ---------------------------------------------------------------------------
export async function sendVerificationEmail(to: string, code: string) {
  const subject = "Memoo - Confirmez votre adresse email";
  const html = emailLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Bienvenue sur Memoo &#x1F44B;</h2>
    <p style="margin:0 0 4px;color:#334155;font-size:15px;">Voici votre code de v&eacute;rification :</p>
    ${codeBlock(code)}
    <p style="margin:0;color:#64748b;font-size:13px;">Ce code expire dans 15 minutes.</p>
  `);

  if (!BREVO_API_KEY) {
    console.log(`[Email] Verification code for ${to}: ${code}`);
    return;
  }

  try {
    await sendEmail(to, subject, html);
  } catch (err) {
    console.error(`[Email] Failed to send verification to ${to}:`, err);
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const subject = "Memoo - Réinitialisation de votre mot de passe";
  const html = emailLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">R&eacute;initialisation du mot de passe</h2>
    <p style="margin:0 0 4px;color:#334155;font-size:15px;">Voici votre code de r&eacute;initialisation :</p>
    ${codeBlock(code)}
    <p style="margin:0;color:#64748b;font-size:13px;">Ce code expire dans 15 minutes. Si vous n'avez pas demand&eacute; cette r&eacute;initialisation, ignorez cet email.</p>
  `);

  if (!BREVO_API_KEY) {
    console.log(`[Email] Password reset code for ${to}: ${code}`);
    return;
  }

  try {
    await sendEmail(to, subject, html);
  } catch (err) {
    console.error(`[Email] Failed to send password reset to ${to}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Test email (dev only)
// ---------------------------------------------------------------------------
export async function sendTestEmail(to: string) {
  const subject = "Test - Email branding Memoo";
  const html = emailLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Test email &#x2705;</h2>
    <p style="margin:0 0 4px;color:#334155;font-size:15px;">Si tu vois ce mail avec le logo Memoo en haut, le branding fonctionne !</p>
    ${codeBlock("123456")}
    <p style="margin:0;color:#64748b;font-size:13px;">Ceci est un email de test envoy&eacute; depuis l'API Memoo.</p>
  `);

  await sendEmail(to, subject, html);
}
