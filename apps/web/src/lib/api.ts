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

// Types – Listes
export type CardFromApi = {
  id: string;
  question: string;
  answers: string[];
};

export type DeckFromApi = {
  id: string;
  name: string;
  cardCount: number;
  isOwned?: boolean;
};

// Types – Sync
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

// API – Lists
export async function fetchLists(): Promise<DeckFromApi[]> {
  const r = await fetch(`${API_BASE}/lists`, { headers: authHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch lists");
  return r.json().then((d: any) => d.decks);
}

export async function fetchMyLists(): Promise<DeckFromApi[]> {
  const r = await fetch(`${API_BASE}/my-lists`, { headers: authHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch my lists");
  return r.json().then((d: any) => d.decks);
}

export async function fetchAvailablePersonalDecks(): Promise<DeckFromApi[]> {
  const r = await fetch(`${API_BASE}/my-decks/available`, { headers: authHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch available personal decks");
  return r.json().then((d: any) => d.decks);
}

export async function addList(deckId: string): Promise<void> {
  const r = await fetch(`${API_BASE}/my-lists`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ deckId }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Failed to add list");
}

export async function removeList(deckId: string): Promise<void> {
  const r = await fetch(`${API_BASE}/my-lists/${deckId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Failed to remove list");
}

export async function deleteDeck(deckId: string): Promise<void> {
  const r = await fetch(`${API_BASE}/my-decks/${deckId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Failed to delete deck");
}

export async function fetchCards(deckId: string): Promise<CardFromApi[]> {
  const r = await fetch(`${API_BASE}/lists/${deckId}/cards`, { headers: authHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch cards");
  return r.json().then((d: any) => d.cards);
}
