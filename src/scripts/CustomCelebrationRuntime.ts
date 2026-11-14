import { loadCustomCelebration } from "./CustomCelebrationStore";
import type { CustomCelebration } from "./CustomCelebrationStore";
import { decodeSound } from "./CustomCelebrationAudio";

/**
 * The custom celebration, made ready in memory ahead of time: the sound
 * decoded and the picture turned into a URL. A celebration has to start
 * inside the tap that confirms the tip, so everything that takes time
 * (reading IndexedDB, decoding audio) is done here, at start-up and after
 * the setup screen saves, never at celebration time.
 */

export interface PreparedCustomCelebration {
  settings: CustomCelebration;
  buffer: AudioBuffer;
  imageUrl: string | null; // object URL of the picture, null without one
}

let prepared: PreparedCustomCelebration | null = null;

/**
 * Load the saved custom celebration and decode it. Any failure (nothing
 * saved, no IndexedDB, an undecodable file) leaves the slot empty, so the
 * celebration is simply absent from the rotation.
 * @returns the prepared celebration, or null when there is none
 */
export async function prepareCustomCelebration(): Promise<PreparedCustomCelebration | null> {
  releasePrepared();
  try {
    const settings = await loadCustomCelebration();
    if (settings === null) return null;
    const buffer = await decodeSound(settings.sound);
    const imageUrl = settings.image ? URL.createObjectURL(settings.image) : null;
    prepared = { settings, buffer, imageUrl };
  } catch (error) {
    console.warn("[Celebration] Custom celebration is not usable:", error);
    prepared = null;
  }
  return prepared;
}

/** The prepared custom celebration, or null when it is not set up (or not ready yet). */
export function getPreparedCustomCelebration(): PreparedCustomCelebration | null {
  return prepared;
}

/** Forget the prepared celebration and free its picture URL. */
export function releasePrepared(): void {
  if (prepared?.imageUrl) URL.revokeObjectURL(prepared.imageUrl);
  prepared = null;
}
