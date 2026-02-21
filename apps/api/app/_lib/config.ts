// ---------------------------------------------------------------------------
// Environment validation — crash early if critical vars are missing
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === "production";

export const JWT_SECRET = isProd
  ? requireEnv("JWT_SECRET")
  : (process.env.JWT_SECRET ?? "dev-secret-local-only");

export const JWT_EXPIRES_IN = "7d";

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

export const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";

export const APP_URL = process.env.APP_URL ?? "https://memoo.fr";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";

export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";

export const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID ?? "";
export const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET ?? "";

// Validate DATABASE_URL at import time so the app fails fast
if (isProd) {
  requireEnv("DATABASE_URL");
}
