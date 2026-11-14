/**
 * Keeps the owner's custom celebration (a sound file, a picture or GIF, and
 * the slice of the sound to play) in this device's IndexedDB.
 *
 * It lives only in the browser's own database: it is never uploaded and
 * never part of the tips or the backup payload. It also stays out of
 * localStorage, whose tip keys the backup and the tip loader scan.
 */

/** Seconds of sound played when the owner has not chosen a length. */
export const DEFAULT_LENGTH_SECONDS = 6;

const DATABASE_NAME = "tipTrackerCelebration";
const STORE_NAME = "custom";
const SLOT_KEY = "slot"; // there is exactly one custom celebration
const DATABASE_VERSION = 1;

export interface CustomCelebration {
  sound: Blob; // audio file chosen on the device
  soundName: string; // its file name, for the setup screen
  image: Blob | null; // picture or GIF, optional
  imageName: string; // "" when there is no image
  startSeconds: number; // where in the sound the clip starts
  lengthSeconds: number; // how long the clip plays
}

/** Turn an IndexedDB request into a promise of its result. */
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolve when a transaction has committed, so a save is really stored. */
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Open (creating on first use) the celebration database.
 * @param factory  the IndexedDB factory; tests pass a fake
 */
export function openCelebrationDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Make typed clip times safe to store and play: a start of 0 or more, and a
 * positive length (the default when the field is empty or not a number).
 * @param start  the typed start in seconds (NaN when empty)
 * @param length  the typed length in seconds (NaN when empty)
 */
export function sanitizeClipTimes(
  start: number,
  length: number,
): { startSeconds: number; lengthSeconds: number } {
  const startSeconds = Number.isFinite(start) && start > 0 ? start : 0;
  const lengthSeconds = Number.isFinite(length) && length > 0 ? length : DEFAULT_LENGTH_SECONDS;
  return { startSeconds, lengthSeconds };
}

/**
 * Whether a stored value has the shape of a custom celebration, so a
 * damaged or older record is treated as "not set up" instead of crashing.
 */
function isCustomCelebration(value: unknown): value is CustomCelebration {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<CustomCelebration>;
  return (
    record.sound instanceof Blob &&
    typeof record.startSeconds === "number" &&
    typeof record.lengthSeconds === "number"
  );
}

/**
 * Read the saved custom celebration.
 * @returns it, or null when none is saved or the record is unusable
 */
export async function loadCustomCelebration(
  factory: IDBFactory = indexedDB,
): Promise<CustomCelebration | null> {
  const database = await openCelebrationDatabase(factory);
  try {
    const store = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    const stored: unknown = await requestResult(store.get(SLOT_KEY));
    return isCustomCelebration(stored) ? stored : null;
  } finally {
    database.close();
  }
}

/** Save (replacing any earlier) custom celebration. Resolves once stored. */
export async function saveCustomCelebration(
  celebration: CustomCelebration,
  factory: IDBFactory = indexedDB,
): Promise<void> {
  const database = await openCelebrationDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(celebration, SLOT_KEY);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

/** Remove the custom celebration, so it drops out of the rotation. */
export async function clearCustomCelebration(factory: IDBFactory = indexedDB): Promise<void> {
  const database = await openCelebrationDatabase(factory);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(SLOT_KEY);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
