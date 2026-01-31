import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Types
export type Review = {
  cardId: string;
  ok: boolean;
  userAnswer: string;
  reviewedAt?: number;
};

export type PushResponse = {
  ok: boolean;
  created: number;
  serverTime: number;
};

export type PullResponse = {
  serverTime: number;
};

// API Functions
export async function apiHealth(): Promise<{ ok: boolean; time: number }> {
  const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error("API health failed");
  return r.json();
}

/**
 * Envoie les reviews au serveur
 * @param reviews Liste des reviews à synchroniser
 */
export async function pushReviews(reviews: Review[]): Promise<PushResponse> {
  const r = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reviews }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Sync push failed");
  return r.json();
}

/**
 * Récupère l'heure serveur (pour sync future)
 */
export async function pullSync(): Promise<PullResponse> {
  const r = await fetch(`${API_BASE}/sync/pull`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Sync pull failed");
  return r.json();
}
