import { useState, useEffect } from "react";
import { getPendingCount as getReviewsPendingCount } from "../lib/sync";
import {
  subscribeSyncStatus,
  initSyncManager,
  isOnline as checkIsOnline,
} from "../lib/sync-manager";
import { getPendingCount as getListOpsPendingCount } from "../lib/offline-queue";
import { refreshCache } from "../lib/api-cache";
import { initMediaCacheListener } from "../lib/media-cache";

type SyncState = "idle" | "syncing" | "offline" | "error";

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [reviewsPendingCount, setReviewsPendingCount] = useState(0);
  const [listOpsPendingCount, setListOpsPendingCount] = useState(0);
  const [listOpsSyncState, setListOpsSyncState] = useState<SyncState>("idle");
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);
  const [mediaCaching, setMediaCaching] = useState<{ deckId: string; cached: number; total: number } | null>(null);
  const [mediaCacheDone, setMediaCacheDone] = useState<{ cached: number; total: number } | null>(null);
  const [mediaOfflineWarning, setMediaOfflineWarning] = useState(false);

  // Initialize sync manager for list operations
  useEffect(() => {
    const cleanup = initSyncManager();
    return cleanup;
  }, []);

  // Update online status
  useEffect(() => {
    setIsOnline(checkIsOnline());

    function handleOnline() {
      console.log("[useSyncStatus] Online");
      setIsOnline(true);
    }

    function handleOffline() {
      console.log("[useSyncStatus] Offline");
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Subscribe to list operations sync status
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status, count) => {
      setListOpsSyncState(status);
      setListOpsPendingCount(count);
    });
    return unsubscribe;
  }, []);

  // Update reviews pending count
  useEffect(() => {
    async function updateReviewsPendingCount() {
      const count = await getReviewsPendingCount();
      setReviewsPendingCount(count);
    }

    updateReviewsPendingCount();

    // Update pending count periodically
    const interval = setInterval(updateReviewsPendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for review sync completion
  useEffect(() => {
    function handleSyncComplete(event: Event) {
      const customEvent = event as CustomEvent<{ count: number }>;
      console.log(`[useSyncStatus] Sync complete: ${customEvent.detail.count} reviews`);
      setLastSyncCount(customEvent.detail.count);
      setReviewsPendingCount(0);

      // Clear notification after 3 seconds
      setTimeout(() => setLastSyncCount(null), 3000);
    }

    window.addEventListener("sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("sync-complete", handleSyncComplete);
    };
  }, []);

  // BUG 5: Listen for rollback events - force cache refresh from server
  useEffect(() => {
    function handleRollback() {
      console.log("[useSyncStatus] Rollback detected, refreshing cache");
      refreshCache().catch(() => {});
    }

    window.addEventListener("sync-rollback", handleRollback);
    return () => window.removeEventListener("sync-rollback", handleRollback);
  }, []);

  // Listen for media cache events from SW
  useEffect(() => {
    const cleanup = initMediaCacheListener();

    function handleStart(event: Event) {
      const { deckId, total } = (event as CustomEvent).detail;
      setMediaCaching({ deckId, cached: 0, total });
    }

    function handleProgress(event: Event) {
      const { deckId, cached, total } = (event as CustomEvent).detail;
      setMediaCaching({ deckId, cached, total });
    }

    function handleComplete(event: Event) {
      const { cached, total } = (event as CustomEvent).detail;
      setMediaCaching(null);
      if (cached > 0) {
        setMediaCacheDone({ cached, total });
        setTimeout(() => setMediaCacheDone(null), 3000);
      }
    }

    function handleOfflineWarning() {
      setMediaOfflineWarning(true);
      setTimeout(() => setMediaOfflineWarning(false), 4000);
    }

    window.addEventListener("media-cache-start", handleStart);
    window.addEventListener("media-cache-progress", handleProgress);
    window.addEventListener("media-cache-complete", handleComplete);
    window.addEventListener("media-cache-offline-warning", handleOfflineWarning);

    return () => {
      cleanup();
      window.removeEventListener("media-cache-start", handleStart);
      window.removeEventListener("media-cache-progress", handleProgress);
      window.removeEventListener("media-cache-complete", handleComplete);
      window.removeEventListener("media-cache-offline-warning", handleOfflineWarning);
    };
  }, []);

  // Combined pending count
  const pendingCount = reviewsPendingCount + listOpsPendingCount;

  // Combined sync state
  const isSyncing = listOpsSyncState === "syncing";
  const hasError = listOpsSyncState === "error";

  return {
    isOnline,
    pendingCount,
    reviewsPendingCount,
    listOpsPendingCount,
    listOpsSyncState,
    isSyncing,
    hasError,
    lastSyncCount,
    mediaCaching,
    mediaCacheDone,
    mediaOfflineWarning,
  };
}
