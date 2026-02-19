/**
 * Service de synchronisation offline-first
 * - Queue les reviews localement (avec mutex pour atomicite)
 * - Deduplique par cardId (scenario upgrade AI)
 * - Synchronise quand le reseau est disponible
 */

import { idbGet, idbSet, withLock } from "./idb";
import { pushReviews, type Review } from "./api";

const QUEUE_KEY = "sync_queue";
const LAST_SYNC_KEY = "last_sync";

type SyncQueue = {
  reviews: Review[];
};

function generateReviewId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Ajoute une review a la queue de sync
 * Remplace la review existante pour le meme cardId (dedup AI upgrade)
 */
export async function queueReview(review: Review): Promise<void> {
  await withLock("sync:reviews", async () => {
    const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };

    const enrichedReview: Review = {
      ...review,
      reviewedAt: review.reviewedAt ?? Date.now(),
      reviewId: review.reviewId ?? generateReviewId(),
    };

    // Dedup: remplacer la review existante pour le meme cardId
    const existingIdx = queue.reviews.findIndex(r => r.cardId === review.cardId);
    if (existingIdx !== -1) {
      console.log("[Sync] Remplacement de la review existante pour la carte", review.cardId);
      queue.reviews[existingIdx] = enrichedReview;
    } else {
      queue.reviews.push(enrichedReview);
    }

    await idbSet(QUEUE_KEY, queue);
  });

  // Tenter une sync immediate (non-bloquante)
  flushQueue().catch(() => {
    // Silencieux en cas d'echec (offline)
  });
}

/**
 * Synchronise la queue avec le serveur
 * @returns Nombre de reviews synchronisees
 */
export async function flushQueue(): Promise<number> {
  return withLock("sync:reviews", async () => {
    const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };

    if (queue.reviews.length === 0) {
      return 0;
    }

    try {
      const result = await pushReviews(queue.reviews);

      if (result.ok) {
        await idbSet(QUEUE_KEY, { reviews: [] });
        await idbSet(LAST_SYNC_KEY, result.serverTime);
        console.log(`[Sync] ${result.created} reviews synchronisees`);
        return result.created;
      }
    } catch (err) {
      console.warn("[Sync] Echec, les reviews restent en queue", err);
      throw err;
    }

    return 0;
  });
}

/**
 * Retourne le nombre de reviews en attente
 */
export async function getPendingCount(): Promise<number> {
  const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };
  return queue.reviews.length;
}

/**
 * Retourne le timestamp de la derniere sync reussie
 */
export async function getLastSyncTime(): Promise<number | null> {
  return idbGet<number>(LAST_SYNC_KEY);
}

/**
 * Vide la queue de reviews (utilise au logout)
 */
export async function clearReviewQueue(): Promise<void> {
  await idbSet(QUEUE_KEY, { reviews: [] });
  await idbSet(LAST_SYNC_KEY, null);
  console.log("[Sync] Queue de reviews videe");
}
