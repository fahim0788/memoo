/**
 * Offline Queue System
 * Stores operations when offline and replays them when back online
 */

import { idbGet, idbSet } from "./idb";

export type OperationType = "ADD_LIST" | "REMOVE_LIST" | "REORDER_LISTS" | "DELETE_DECK";

export type QueuedOperation = {
  id: string;
  type: OperationType;
  payload: {
    deckId?: string;
    deckIds?: string[];
    icon?: string;
    // Snapshot for rollback
    snapshot?: {
      myLists?: unknown[];
      allLists?: unknown[];
      availablePersonal?: unknown[];
    };
  };
  createdAt: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

const QUEUE_KEY = "offline:operations-queue";
const MAX_RETRIES = 5;

/**
 * Generate a unique operation ID
 */
function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all queued operations
 */
export async function getQueue(): Promise<QueuedOperation[]> {
  const queue = await idbGet<QueuedOperation[]>(QUEUE_KEY);
  return queue || [];
}

/**
 * Add an operation to the queue
 */
export async function enqueue(
  type: OperationType,
  payload: QueuedOperation["payload"]
): Promise<QueuedOperation> {
  const queue = await getQueue();

  const operation: QueuedOperation = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  queue.push(operation);
  await idbSet(QUEUE_KEY, queue);

  console.log("[OfflineQueue] Enqueued operation:", operation.type, operation.id);
  return operation;
}

/**
 * Update an operation's status
 */
export async function updateOperation(
  id: string,
  updates: Partial<Pick<QueuedOperation, "status" | "retryCount" | "lastError">>
): Promise<void> {
  const queue = await getQueue();
  const index = queue.findIndex(op => op.id === id);

  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    await idbSet(QUEUE_KEY, queue);
  }
}

/**
 * Remove an operation from the queue (after successful sync)
 */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(op => op.id !== id);
  await idbSet(QUEUE_KEY, filtered);
  console.log("[OfflineQueue] Dequeued operation:", id);
}

/**
 * Get pending operations count
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.filter(op => op.status === "pending" || op.status === "failed").length;
}

/**
 * Check if an operation should be retried
 */
export function shouldRetry(operation: QueuedOperation): boolean {
  return operation.retryCount < MAX_RETRIES;
}

/**
 * Clear all operations (use with caution)
 */
export async function clearQueue(): Promise<void> {
  await idbSet(QUEUE_KEY, []);
  console.log("[OfflineQueue] Queue cleared");
}

/**
 * Get operations that need to be synced
 */
export async function getOperationsToSync(): Promise<QueuedOperation[]> {
  const queue = await getQueue();
  return queue.filter(
    op => op.status === "pending" || (op.status === "failed" && shouldRetry(op))
  );
}
