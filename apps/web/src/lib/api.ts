const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export type PullResponse = {
  serverTime: number;
  // for MVP: just return full snapshot of decks/cards if you want. We keep minimal.
};

export async function apiHealth(): Promise<{ ok: boolean; time: number }> {
  const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error("API health failed");
  return r.json();
}
