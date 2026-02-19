/**
 * Vitest setup - mock browser APIs not available in jsdom
 */

// Mock IndexedDB via simple in-memory Map
const store = new Map<string, unknown>();

const fakeIdbGet = async <T>(key: string): Promise<T | null> => {
  return (store.get(key) as T) ?? null;
};

const fakeIdbSet = async <T>(key: string, value: T): Promise<void> => {
  if (value === null || value === undefined) {
    store.delete(key);
  } else {
    store.set(key, value);
  }
};

// Async mutex mock - mirrors real withLock behavior for proper serialization
const lockChains = new Map<string, Promise<unknown>>();

const fakeWithLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const prev = lockChains.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  lockChains.set(key, next);
  try {
    return await next;
  } finally {
    if (lockChains.get(key) === next) lockChains.delete(key);
  }
};

// Expose for tests that need to inspect/reset
(globalThis as any).__idbStore = store;

// Mock the idb module
import { vi } from "vitest";
vi.mock("../lib/idb", () => ({
  idbGet: fakeIdbGet,
  idbSet: fakeIdbSet,
  withLock: fakeWithLock,
}));

// Reset store between tests
import { beforeEach } from "vitest";
beforeEach(() => {
  store.clear();
  lockChains.clear();
  localStorage.clear();
});
