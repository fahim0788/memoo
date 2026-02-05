import { useState, useEffect } from "react";
import { getPendingCount as getReviewsPendingCount } from "../lib/sync";
import {
  subscribeSyncStatus,
  initSyncManager,
  isOnline as checkIsOnline,
} from "../lib/sync-manager";
import { getPendingCount as getListOpsPendingCount } from "../lib/offline-queue";

type SyncState = "idle" | "syncing" | "offline" | "error";

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [reviewsPendingCount, setReviewsPendingCount] = useState(0);
  const [listOpsPendingCount, setListOpsPendingCount] = useState(0);
  const [listOpsSyncState, setListOpsSyncState] = useState<SyncState>("idle");
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);

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
  };
}
