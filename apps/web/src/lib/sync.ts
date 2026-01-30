/**
 * Service de synchronisation offline-first
 * - Queue les reviews localement
 * - Synchronise quand le réseau est disponible
 */

import { idbGet, idbSet } from "./idb";
import { pushReviews, type Review } from "./api";

const QUEUE_KEY = "sync_queue";
const LAST_SYNC_KEY = "last_sync";

type SyncQueue = {
  reviews: Review[];
};

/**
 * Ajoute une review à la queue de sync
 */
export async function queueReview(review: Review): Promise<void> {
  const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };
  queue.reviews.push({
    ...review,
    reviewedAt: review.reviewedAt ?? Date.now(),
  });
  await idbSet(QUEUE_KEY, queue);

  // Tenter une sync immédiate (non-bloquante)
  flushQueue().catch(() => {
    // Silencieux en cas d'échec (offline)
  });
}

/**
 * Synchronise la queue avec le serveur
 * @returns Nombre de reviews synchronisées
 */
export async function flushQueue(): Promise<number> {
  const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };

  if (queue.reviews.length === 0) {
    return 0;
  }

  try {
    const result = await pushReviews(queue.reviews);

    if (result.ok) {
      // Vider la queue après succès
      await idbSet(QUEUE_KEY, { reviews: [] });
      await idbSet(LAST_SYNC_KEY, result.serverTime);
      console.log(`[Sync] ${result.created} reviews synchronisées`);
      return result.created;
    }
  } catch (err) {
    console.warn("[Sync] Échec, les reviews restent en queue", err);
    throw err;
  }

  return 0;
}

/**
 * Retourne le nombre de reviews en attente
 */
export async function getPendingCount(): Promise<number> {
  const queue = (await idbGet<SyncQueue>(QUEUE_KEY)) ?? { reviews: [] };
  return queue.reviews.length;
}

/**
 * Retourne le timestamp de la dernière sync réussie
 */
export async function getLastSyncTime(): Promise<number | null> {
  return idbGet<number>(LAST_SYNC_KEY);
}
