import { NextRequest } from "next/server";
import { json } from "./cors";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (no external dependency)
// ---------------------------------------------------------------------------

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

// Cleanup stale entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  buckets.forEach((entry, key) => {
    if (now > entry.resetAt) buckets.delete(key);
  });
}, 5 * 60_000);

/**
 * Returns a 429 response if the caller exceeds `maxRequests` within
 * `windowMs` milliseconds, or `null` if the request is allowed.
 */
export function rateLimit(
  req: NextRequest,
  { maxRequests, windowMs, prefix }: { maxRequests: number; windowMs: number; prefix: string },
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    const res = json({ error: "Too many requests. Try again later." }, req, 429);
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }

  return null;
}
