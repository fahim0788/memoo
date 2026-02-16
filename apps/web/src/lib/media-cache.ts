/**
 * Media precaching orchestrator
 * Extracts media URLs from cards, sends to SW for caching, tracks status in IDB
 */

import { STORAGE_BASE, type CardFromApi } from "./api";
import { idbGet, idbSet } from "./idb";

const MEDIA_STATUS_KEY = (deckId: string) => `media-cache:${deckId}`;

export type MediaCacheStatus = {
  deckId: string;
  total: number;
  cached: number;
  status: "caching" | "done";
  timestamp: number;
};

/** Extract all media URLs from cards, deduped */
export function extractMediaUrls(cards: CardFromApi[]): string[] {
  const urls: string[] = [];
  for (const card of cards) {
    if (card.audioUrlEn) urls.push(`${STORAGE_BASE}${card.audioUrlEn}`);
    if (card.audioUrlFr) urls.push(`${STORAGE_BASE}${card.audioUrlFr}`);
    if (card.imageUrl) urls.push(`${STORAGE_BASE}${card.imageUrl}`);
  }
  return [...new Set(urls)];
}

/**
 * Trigger media precaching for a deck via Service Worker.
 * Non-blocking: returns immediately, caching happens in background.
 */
export async function precacheDeckMedia(deckId: string, cards: CardFromApi[]): Promise<void> {
  const urls = extractMediaUrls(cards);
  if (urls.length === 0) return;

  const registration = await navigator.serviceWorker?.ready;
  if (!registration?.active) {
    console.warn("[MediaCache] No active service worker");
    return;
  }

  await idbSet<MediaCacheStatus>(MEDIA_STATUS_KEY(deckId), {
    deckId,
    total: urls.length,
    cached: 0,
    status: "caching",
    timestamp: Date.now(),
  });

  window.dispatchEvent(
    new CustomEvent("media-cache-start", { detail: { deckId, total: urls.length } })
  );

  registration.active.postMessage({
    type: "CACHE_DECK_MEDIA",
    payload: { deckId, urls },
  });
}

/** Check if a deck's media has been fully cached */
export async function isDeckMediaCached(deckId: string): Promise<boolean> {
  const status = await idbGet<MediaCacheStatus>(MEDIA_STATUS_KEY(deckId));
  return status?.status === "done" && status.cached === status.total;
}

/**
 * Initialize the listener for SW messages about media caching.
 * Call once at app startup. Returns cleanup function.
 */
export function initMediaCacheListener(): () => void {
  function handleSwMessage(event: MessageEvent) {
    const { type, payload } = event.data || {};

    if (type === "MEDIA_CACHE_PROGRESS") {
      const { deckId, cached, total } = payload;
      idbSet<MediaCacheStatus>(MEDIA_STATUS_KEY(deckId), {
        deckId, total, cached,
        status: "caching",
        timestamp: Date.now(),
      });
      window.dispatchEvent(
        new CustomEvent("media-cache-progress", { detail: { deckId, cached, total } })
      );
    }

    if (type === "MEDIA_CACHE_COMPLETE") {
      const { deckId, cached, total } = payload;
      idbSet<MediaCacheStatus>(MEDIA_STATUS_KEY(deckId), {
        deckId, total, cached,
        status: "done",
        timestamp: Date.now(),
      });
      window.dispatchEvent(
        new CustomEvent("media-cache-complete", { detail: { deckId, cached, total } })
      );
    }
  }

  navigator.serviceWorker?.addEventListener("message", handleSwMessage);
  return () => {
    navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
  };
}
