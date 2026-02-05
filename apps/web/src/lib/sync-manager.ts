/**
 * Sync Manager
 * Handles online/offline detection, queue processing, and retry logic
 */

import {
  getOperationsToSync,
  updateOperation,
  dequeue,
  shouldRetry,
  type QueuedOperation,
  getPendingCount,
} from "./offline-queue";
import {
  addList as apiAddList,
  removeList as apiRemoveList,
  deleteDeck as apiDeleteDeck,
} from "./api";
import { idbGet, idbSet } from "./idb";

// Cache keys (same as api-cache.ts)
const CACHE_KEYS = {
  ALL_LISTS: "cache:all-lists",
  MY_LISTS: "cache:my-lists",
  AVAILABLE_PERSONAL: "cache:available-personal",
};

type SyncStatus = "idle" | "syncing" | "offline" | "error";
type SyncListener = (status: SyncStatus, pendingCount: number) => void;

let currentStatus: SyncStatus = "idle";
let listeners: SyncListener[] = [];
let syncInProgress = false;
let retryTimeoutId: NodeJS.Timeout | null = null;

// Exponential backoff delays (in ms)
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.push(listener);
  // Immediately notify of current status
  getPendingCount().then(count => listener(currentStatus, count));

  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

/**
 * Notify all listeners of status change
 */
async function notifyListeners(): Promise<void> {
  const count = await getPendingCount();
  listeners.forEach(listener => listener(currentStatus, count));
}

/**
 * Set sync status and notify listeners
 */
async function setStatus(status: SyncStatus): Promise<void> {
  if (currentStatus !== status) {
    currentStatus = status;
    console.log("[SyncManager] Status changed:", status);
    await notifyListeners();
  }
}

/**
 * Execute a single operation against the API
 */
async function executeOperation(operation: QueuedOperation): Promise<void> {
  const { type, payload } = operation;

  switch (type) {
    case "ADD_LIST":
      await apiAddList(payload.deckId);
      break;
    case "REMOVE_LIST":
      await apiRemoveList(payload.deckId);
      break;
    case "DELETE_DECK":
      await apiDeleteDeck(payload.deckId);
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

/**
 * Rollback an operation by restoring the snapshot
 */
async function rollbackOperation(operation: QueuedOperation): Promise<void> {
  const { snapshot } = operation.payload;
  if (!snapshot) {
    console.warn("[SyncManager] No snapshot for rollback:", operation.id);
    return;
  }

  console.log("[SyncManager] Rolling back operation:", operation.id);

  if (snapshot.myLists !== undefined) {
    await idbSet(CACHE_KEYS.MY_LISTS, { data: snapshot.myLists, timestamp: Date.now() });
  }
  if (snapshot.allLists !== undefined) {
    await idbSet(CACHE_KEYS.ALL_LISTS, { data: snapshot.allLists, timestamp: Date.now() });
  }
  if (snapshot.availablePersonal !== undefined) {
    await idbSet(CACHE_KEYS.AVAILABLE_PERSONAL, { data: snapshot.availablePersonal, timestamp: Date.now() });
  }
}

/**
 * Process a single operation
 */
async function processOperation(operation: QueuedOperation): Promise<boolean> {
  try {
    await updateOperation(operation.id, { status: "syncing" });
    await executeOperation(operation);
    await dequeue(operation.id);
    console.log("[SyncManager] Operation synced successfully:", operation.id);
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[SyncManager] Operation failed:", operation.id, errorMessage);

    if (shouldRetry(operation)) {
      await updateOperation(operation.id, {
        status: "failed",
        retryCount: operation.retryCount + 1,
        lastError: errorMessage,
      });
      return false;
    } else {
      // Max retries reached - rollback and remove from queue
      console.warn("[SyncManager] Max retries reached, rolling back:", operation.id);
      await rollbackOperation(operation);
      await dequeue(operation.id);
      return false;
    }
  }
}

/**
 * Process all pending operations in the queue
 */
export async function processQueue(): Promise<void> {
  if (syncInProgress) {
    console.log("[SyncManager] Sync already in progress, skipping");
    return;
  }

  if (!isOnline()) {
    await setStatus("offline");
    return;
  }

  const operations = await getOperationsToSync();
  if (operations.length === 0) {
    await setStatus("idle");
    return;
  }

  syncInProgress = true;
  await setStatus("syncing");

  console.log("[SyncManager] Processing", operations.length, "operations");

  let hasFailures = false;

  // Process operations in order (FIFO)
  for (const operation of operations) {
    if (!isOnline()) {
      console.log("[SyncManager] Went offline during sync");
      await setStatus("offline");
      hasFailures = true;
      break;
    }

    const success = await processOperation(operation);
    if (!success) {
      hasFailures = true;
    }
  }

  syncInProgress = false;

  // Check remaining operations
  const remaining = await getOperationsToSync();
  if (remaining.length > 0) {
    if (hasFailures) {
      await setStatus("error");
      scheduleRetry();
    }
  } else {
    await setStatus("idle");
  }

  // Notify listeners of final count
  await notifyListeners();
}

/**
 * Schedule a retry with exponential backoff
 */
function scheduleRetry(): void {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
  }

  // Get the highest retry count from pending operations
  getOperationsToSync().then(ops => {
    const maxRetries = Math.max(...ops.map(op => op.retryCount), 0);
    const delayIndex = Math.min(maxRetries, RETRY_DELAYS.length - 1);
    const delay = RETRY_DELAYS[delayIndex];

    console.log("[SyncManager] Scheduling retry in", delay, "ms");
    retryTimeoutId = setTimeout(() => {
      processQueue();
    }, delay);
  });
}

/**
 * Force an immediate sync attempt
 */
export async function forceSync(): Promise<void> {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  await processQueue();
}

/**
 * Initialize the sync manager (call once at app startup)
 */
export function initSyncManager(): () => void {
  console.log("[SyncManager] Initializing");

  // Set initial status
  if (!isOnline()) {
    setStatus("offline");
  } else {
    // Try to process any pending operations on startup
    processQueue();
  }

  // Listen for online/offline events
  const handleOnline = () => {
    console.log("[SyncManager] Browser came online");
    processQueue();
  };

  const handleOffline = () => {
    console.log("[SyncManager] Browser went offline");
    setStatus("offline");
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  // Cleanup function
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
    }
  };
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return currentStatus;
}
