import { prepareClip } from "./CelebrationClip";
import { loadStoredPackCelebrations } from "./CelebrationPackStore";
import type { StoredPackCelebration } from "./CelebrationPackStore";
import { PACK_NAME_PREFIX } from "./CelebrationRotation";
import type { PackCelebrationName } from "./CelebrationRotation";

/**
 * The celebration pack made ready in memory, ahead of any tap: each sound
 * decoded and cut down to its clip (a few seconds, not the whole song, so
 * memory stays small), each picture turned into a URL. A pack celebration has
 * to start inside the Confirm tap, so all the slow work happens here, after
 * start-up and after each sync, never at celebration time.
 *
 * Nothing is ever fatal: a sound that cannot be decoded just drops that
 * celebration's sound (or the whole celebration if it has nothing else).
 */

export interface PreparedPackCelebration {
  name: PackCelebrationName; // "pack:" plus the server's id for it
  title: string; // the name the owner gave it in the console
  clip: AudioBuffer | null; // the sound already cut to its clip, null for a picture-only celebration
  imageUrl: string | null; // its picture, null for a sound-only celebration
}

let celebrations: PreparedPackCelebration[] = [];
let imageUrls: string[] = [];
let objectUrls: string[] = [];

/** An object URL for a picture, remembered so it can be freed later. */
function urlFor(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

/** Free every picture URL and forget the prepared celebrations. */
export function releasePackCelebrations(): void {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
  imageUrls = [];
  celebrations = [];
}

/** Make one stored celebration playable; null when neither its sound nor its picture can be used. */
async function prepareOne(stored: StoredPackCelebration): Promise<PreparedPackCelebration | null> {
  const clip = stored.sound ? await prepareClip(stored.sound.blob, stored.startSeconds, stored.lengthSeconds) : null;
  const imageUrl = stored.picture ? urlFor(stored.picture.blob) : null;
  if (clip === null && imageUrl === null) return null;
  return {
    name: `${PACK_NAME_PREFIX}${stored.id}`,
    title: stored.name,
    clip,
    imageUrl,
  };
}

/** Prepare every stored celebration, keeping those that are playable. */
async function prepareAll(source: StoredPackCelebration[]): Promise<PreparedPackCelebration[]> {
  const prepared: PreparedPackCelebration[] = [];
  for (const celebration of source) {
    const ready = await prepareOne(celebration);
    if (ready !== null) prepared.push(ready);
  }
  return prepared;
}

/**
 * Make pack celebrations ready to play, replacing whatever was prepared before.
 * Never rejects.
 * @param stored  the celebrations to prepare; when omitted they are read from this device's pack database
 */
export async function preparePackCelebrations(stored?: StoredPackCelebration[]): Promise<void> {
  try {
    const source = stored ?? (await loadStoredPackCelebrations());
    releasePackCelebrations();
    celebrations = await prepareAll(source);
    // Only pictures of playable celebrations count for a sound that has none of its own.
    imageUrls = celebrations.flatMap((celebration) => (celebration.imageUrl ? [celebration.imageUrl] : []));
  } catch (error) {
    console.warn("[Celebration] Could not prepare the pack:", error);
    releasePackCelebrations();
  }
}

/** The prepared pack celebrations, in the order the device stored them (empty until a pack is on the device). */
export function getPackCelebrations(): PreparedPackCelebration[] {
  return celebrations;
}

/** Every picture in the pack (for a sound with no picture of its own). */
export function getPackImageUrls(): string[] {
  return imageUrls;
}
