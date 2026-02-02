import { useState, useEffect } from "react";
import { getPendingCount } from "../lib/sync";

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);

  // Update online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

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

  // Update pending count
  useEffect(() => {
    async function updatePendingCount() {
      const count = await getPendingCount();
      setPendingCount(count);
    }

    updatePendingCount();

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for sync completion
  useEffect(() => {
    function handleSyncComplete(event: Event) {
      const customEvent = event as CustomEvent<{ count: number }>;
      console.log(`[useSyncStatus] Sync complete: ${customEvent.detail.count} reviews`);
      setLastSyncCount(customEvent.detail.count);
      setPendingCount(0);

      // Clear notification after 3 seconds
      setTimeout(() => setLastSyncCount(null), 3000);
    }

    window.addEventListener("sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("sync-complete", handleSyncComplete);
    };
  }, []);

  return {
    isOnline,
    pendingCount,
    lastSyncCount,
  };
}
