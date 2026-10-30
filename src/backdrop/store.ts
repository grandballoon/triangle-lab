// Where the background photo, and where it was placed, are kept between
// pages: IndexedDB, since a photo is too big for localStorage. Without it the
// photo lasts for this page only.

import { COVER, readPlacement, type Placement } from "./core.ts";

export interface Saved {
  photo: Blob;
  placement: Placement;
}

export interface PhotoStore {
  load(): Promise<Saved | null>;
  save(saved: Saved | null): Promise<void>;
}

const DB = "triangle-lab-backdrop";
const STORE = "photo";
const KEY = "photo";

export function idbStore(): PhotoStore {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const run = async <T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = act(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  };
  return {
    async load() {
      try {
        return readSaved(await run("readonly", (s) => s.get(KEY)));
      } catch {
        return null;
      }
    },
    async save(saved) {
      try {
        if (saved) await run("readwrite", (s) => s.put(saved, KEY));
        else await run("readwrite", (s) => s.delete(KEY));
      } catch {
        // Blocked or full: the photo lasts for this page only.
      }
    },
  };
}

/** What was kept, if anything. A bare photo was kept before photos could be moved. */
export function readSaved(value: unknown): Saved | null {
  if (value instanceof Blob) return { photo: value, placement: COVER };
  if (!value || typeof value !== "object") return null;
  const { photo, placement } = value as Record<string, unknown>;
  return photo instanceof Blob ? { photo, placement: readPlacement(placement) } : null;
}
