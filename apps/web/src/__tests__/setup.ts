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

// Expose for tests that need to inspect/reset
(globalThis as any).__idbStore = store;

// Mock the idb module
import { vi } from "vitest";
vi.mock("../lib/idb", () => ({
  idbGet: fakeIdbGet,
  idbSet: fakeIdbSet,
}));

// Reset store between tests
import { beforeEach } from "vitest";
beforeEach(() => {
  store.clear();
  localStorage.clear();
});
