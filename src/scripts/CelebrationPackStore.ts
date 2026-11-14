/**
 * The celebration pack's celebrations on this device, in IndexedDB.
 *
 * Like the custom celebration slot, this is the browser's own database only:
 * pack files are never put in localStorage (where the tips live) and never
 * in the backup payload.
 */

const DATABASE_NAME = "tipTrackerCelebrationPack";
const STORE_NAME = "celebrations";
const DATABASE_VERSION = 1;

/** One downloaded medium of a celebration: its manifest hash and the file itself. */
export interface StoredMedium {
  size: number; // bytes
  sha256: string; // the hash the server's manifest gave; a different hash means a new version
  blob: Blob;
}

/** One celebration of the pack as kept on the device (works with no network). */
export interface StoredPackCelebration {
  id: string; // the key: the server's celebration id
  name: string;
  startSeconds: number;
  lengthSeconds: number;
  sound: StoredMedium | null;
  picture: StoredMedium | null;
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

function isStoredMedium(value: unknown): value is StoredMedium | null {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const medium = value as Partial<StoredMedium>;
  return typeof medium.size === "number" && typeof medium.sha256 === "string" && medium.blob instanceof Blob;
}

/** Whether a stored value is a usable celebration, so damaged records are skipped rather than crashing. */
function isStoredCelebration(value: unknown): value is StoredPackCelebration {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<StoredPackCelebration>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.startSeconds === "number" &&
    typeof record.lengthSeconds === "number" &&
    isStoredMedium(record.sound) &&
    isStoredMedium(record.picture)
  );
}

/** Every pack celebration stored on this device (damaged records left out). */
export async function loadStoredPackCelebrations(factory: IDBFactory = indexedDB): Promise<StoredPackCelebration[]> {
  const database = await openPackDatabase(factory);
  try {
    const store = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    const all: unknown[] = await requestResult(store.getAll());
    return all.filter(isStoredCelebration);
  } finally {
    database.close();
  }
}

/** Store (or replace) one celebration. Resolves once it is really stored; rejects on a full disk. */
export async function savePackCelebration(celebration: StoredPackCelebration, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await openPackDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(celebration, celebration.id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

/** Delete one celebration by id (nothing happens if it is not stored). */
export async function deletePackCelebration(id: string, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await openPackDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
