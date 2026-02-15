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

// Validate DATABASE_URL at import time so the app fails fast
if (isProd) {
  requireEnv("DATABASE_URL");
}
