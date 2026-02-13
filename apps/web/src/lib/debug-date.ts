/**
 * Debug date override for simulating spaced repetition.
 *
 * Set localStorage key "debug_date" to a YYYY-MM-DD string (e.g. "2026-03-01")
 * to override the current date in all SR calculations.
 * Remove the key to use the real date.
 */

const KEY = "debug_date";

/** Returns overridden Date.now() or real Date.now() */
export function debugNow(): number {
  if (typeof localStorage === "undefined") return Date.now();
  const val = localStorage.getItem(KEY);
  if (!val) return Date.now();
  const ms = new Date(val).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

/** Returns overridden Date or real Date */
export function debugDate(): Date {
  if (typeof localStorage === "undefined") return new Date();
  const val = localStorage.getItem(KEY);
  if (!val) return new Date();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
