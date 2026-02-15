import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

// Base URL for storage (audio files, etc.)
// In dev: http://localhost:3001 (removes /api suffix)
// In prod: empty string (same origin, nginx serves both)
function getStorageBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  if (apiBase.includes("://")) {
    return apiBase.replace(/\/api$/, "");
  }
  return "";
}

export const STORAGE_BASE = getStorageBase();

// Helper – Extract emoji from deck name
export function extractEmoji(text: string): { emoji: string; name: string } {
  const emojiMatch = text.match(/^(\p{Emoji})\s+/u);
  if (emojiMatch) {
    return { emoji: emojiMatch[1], name: text.slice(emojiMatch[1].length).trim() };
  }
  return { emoji: "", name: text };
}

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
  audioUrlEn?: string | null;
  audioUrlFr?: string | null;
  imageUrl?: string | null;
  chapterId?: string | null;
};

export type ChapterFromApi = {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  cardCount: number;
};

export type DeckFromApi = {
  id: string;
  name: string;
  cardCount: number;
  chapterCount?: number;
  isOwned?: boolean;
  icon?: string | null;
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

// Types – Leaderboard
export type LeaderboardEntry = {
  rank: number;
  firstName: string;
  score: number;
  successRate: number;
  totalReviews: number;
};

export type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  currentUser: { rank: number; score: number; successRate: number } | null;
};

// Error helper – user-friendly French messages
async function apiError(r: Response, action: string): Promise<never> {
  let detail = "";
  try {
    const body = await r.json();
    if (body.error) detail = body.error;
  } catch { /* ignore parse errors */ }

  if (r.status === 401) throw new Error("Session expirée, veuillez vous reconnecter");
  if (r.status === 403) throw new Error("Action non autorisée");
  if (r.status === 404) throw new Error("Élément introuvable");
  if (r.status >= 500) throw new Error(`Erreur serveur (${r.status}). Réessayez dans quelques instants.`);
  throw new Error(detail || `Impossible de ${action}`);
}

function networkError(action: string): never {
  if (!navigator.onLine) throw new Error("Vous êtes hors ligne. Vérifiez votre connexion internet.");
  throw new Error(`Connexion au serveur impossible. Impossible de ${action}.`);
}

async function safeFetch(input: RequestInfo, init: RequestInit | undefined, action: string): Promise<Response> {
  try {
    const r = await fetch(input, init);
    if (!r.ok) await apiError(r, action);
    return r;
  } catch (err) {
    if (err instanceof TypeError) networkError(action);
    throw err;
  }
}

// API Functions
export async function apiHealth(): Promise<{ ok: boolean; time: number }> {
  const r = await safeFetch(`${API_BASE}/health`, { cache: "no-store" }, "vérifier le serveur");
  return r.json();
}

/**
 * Envoie les reviews au serveur
 * @param reviews Liste des reviews à synchroniser
 */
export async function pushReviews(reviews: Review[]): Promise<PushResponse> {
  const r = await safeFetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reviews }),
    cache: "no-store",
  }, "synchroniser les révisions");
  return r.json();
}

export async function pullSync(): Promise<PullResponse> {
  const r = await safeFetch(`${API_BASE}/sync/pull`, {
    headers: authHeaders(),
    cache: "no-store",
  }, "synchroniser");
  return r.json();
}

// API – Lists
export async function fetchLists(): Promise<DeckFromApi[]> {
  const r = await safeFetch(`${API_BASE}/lists`, { headers: authHeaders(), cache: "no-store" }, "charger les listes");
  return r.json().then((d: any) => d.decks);
}

export async function fetchMyLists(): Promise<DeckFromApi[]> {
  const r = await safeFetch(`${API_BASE}/my-lists`, { headers: authHeaders(), cache: "no-store" }, "charger vos listes");
  return r.json().then((d: any) => d.decks);
}

export async function fetchAvailablePersonalDecks(): Promise<DeckFromApi[]> {
  const r = await safeFetch(`${API_BASE}/my-decks/available`, { headers: authHeaders(), cache: "no-store" }, "charger les listes personnelles");
  return r.json().then((d: any) => d.decks);
}

export async function addList(deckId: string, icon?: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-lists`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ deckId, icon: icon || undefined }),
    cache: "no-store",
  }, "ajouter la liste");
}

export async function removeList(deckId: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-lists/${deckId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  }, "retirer la liste");
}

export async function reorderLists(deckIds: string[]): Promise<void> {
  await safeFetch(`${API_BASE}/my-lists/reorder`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ deckIds }),
    cache: "no-store",
  }, "réorganiser les listes");
}

export async function deleteDeck(deckId: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-decks/${deckId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  }, "supprimer la liste");
}

export async function updateDeck(deckId: string, name: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-decks/${deckId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
    cache: "no-store",
  }, "renommer la liste");
}

export async function addCard(deckId: string, question: string, answers: string[], imageUrl?: string | null): Promise<CardFromApi> {
  const r = await safeFetch(`${API_BASE}/my-decks/${deckId}/cards`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question, answers, imageUrl }),
    cache: "no-store",
  }, "ajouter la carte");
  return r.json().then((d: any) => d.card);
}

export async function updateCard(deckId: string, cardId: string, question: string, answers: string[], imageUrl?: string | null): Promise<void> {
  await safeFetch(`${API_BASE}/my-decks/${deckId}/cards/${cardId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ question, answers, imageUrl }),
    cache: "no-store",
  }, "modifier la carte");
}

export async function deleteCard(deckId: string, cardId: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-decks/${deckId}/cards/${cardId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  }, "supprimer la carte");
}

export async function fetchCards(deckId: string): Promise<CardFromApi[]> {
  const r = await safeFetch(`${API_BASE}/lists/${deckId}/cards`, { headers: authHeaders(), cache: "no-store" }, "charger les cartes");
  return r.json().then((d: any) => d.cards);
}

export async function fetchChapters(deckId: string): Promise<ChapterFromApi[]> {
  const r = await safeFetch(`${API_BASE}/lists/${deckId}/chapters`, { headers: authHeaders(), cache: "no-store" }, "charger les chapitres");
  return r.json().then((d: any) => d.chapters);
}

export async function classifyDeck(deckId: string): Promise<ChapterFromApi[]> {
  const r = await safeFetch(`${API_BASE}/lists/${deckId}/classify`, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
  }, "classifier les cartes");
  return r.json().then((d: any) => d.chapters);
}

export async function fetchLeaderboard(deckId: string): Promise<LeaderboardResponse> {
  const r = await safeFetch(`${API_BASE}/lists/${deckId}/leaderboard`, { headers: authHeaders(), cache: "no-store" }, "charger le classement");
  return r.json();
}

export async function evaluateAnswer(
  cardId: string,
  userAnswer: string,
  question: string,
  referenceAnswers: string[],
): Promise<{ acceptable: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await safeFetch(`${API_BASE}/cards/${cardId}/evaluate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userAnswer, question, referenceAnswers }),
      signal: controller.signal,
      cache: "no-store",
    }, "évaluer la réponse");
    return r.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function updateDeckIcon(deckId: string, icon: string): Promise<void> {
  await safeFetch(`${API_BASE}/my-lists/${deckId}/icon`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ icon }),
    cache: "no-store",
  }, "mettre à jour l'icône");
}
