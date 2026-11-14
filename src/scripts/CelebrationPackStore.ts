import type { PackFileKind } from "./CelebrationPackNames";

/**
 * The celebration pack's files on this device, in IndexedDB.
 *
 * Like the custom celebration slot, this is the browser's own database only:
 * pack files are never put in localStorage (where the tips live) and never
 * in the backup payload.
 */

const DATABASE_NAME = "tipTrackerCelebrationPack";
const STORE_NAME = "files";
const DATABASE_VERSION = 1;

/** One downloaded pack file. */
export interface StoredPackFile {
  name: string; // the key: the file name on the server
  kind: PackFileKind;
  size: number; // bytes
  sha256: string; // the hash the server's manifest gave; a different hash means a new version
  blob: Blob;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Open (creating on first use) the pack database. @param factory  the IndexedDB factory; tests pass a fake */
function openPackDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Whether a stored value is a usable pack file, so damaged records are skipped rather than crashing. */
function isStoredPackFile(value: unknown): value is StoredPackFile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<StoredPackFile>;
  return (
    typeof record.name === "string" &&
    (record.kind === "sound" || record.kind === "image") &&
    typeof record.size === "number" &&
    typeof record.sha256 === "string" &&
    record.blob instanceof Blob
  );
}

/** Every pack file stored on this device (damaged records left out). */
export async function loadStoredPackFiles(factory: IDBFactory = indexedDB): Promise<StoredPackFile[]> {
  const database = await openPackDatabase(factory);
  try {
    const store = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    const all: unknown[] = await requestResult(store.getAll());
    return all.filter(isStoredPackFile);
  } finally {
    database.close();
  }
}

/** Store (or replace) one pack file. Resolves once it is really stored; rejects on a full disk. */
export async function savePackFile(file: StoredPackFile, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await openPackDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, file.name);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

/** Delete one pack file by name (nothing happens if it is not stored). */
export async function deletePackFile(name: string, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await openPackDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(name);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
