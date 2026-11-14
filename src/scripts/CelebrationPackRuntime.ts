import { pairPackFiles, parsePackFileName, resolveClip } from "./CelebrationPackNames";
import type { PackCelebrationFiles } from "./CelebrationPackNames";
import { loadStoredPackFiles } from "./CelebrationPackStore";
import { PACK_NAME_PREFIX } from "./CelebrationRotation";
import type { PackCelebrationName } from "./CelebrationRotation";
import { decodeSound } from "./CustomCelebrationAudio";
import { getAudioContext } from "./CelebrationSounds";

/**
 * The celebration pack made ready in memory, ahead of any tap: each sound
 * decoded and cut down to its clip (a few seconds, not the whole song, so
 * memory stays small), each picture turned into a URL. A pack celebration has
 * to start inside the Confirm tap, so all the slow work happens here, after
 * start-up and after each sync, never at celebration time.
 *
 * Nothing is ever fatal: a file that cannot be decoded just drops that
 * celebration's sound (or the whole celebration if it has nothing else).
 */

export interface PackFile {
  name: string;
  blob: Blob;
}

export interface PreparedPackCelebration {
  name: PackCelebrationName;
  clip: AudioBuffer | null; // the sound already cut to its clip, null for a picture-only celebration
  imageUrl: string | null; // its paired picture, null for a sound-only celebration
}

let celebrations: PreparedPackCelebration[] = [];
let imageUrls: string[] = [];
let objectUrls: string[] = [];

/**
 * Copy part of a decoded sound into a new, shorter buffer.
 * @param context  the audio context that makes the buffer
 * @param source  the whole decoded sound
 * @param startSeconds  where the clip starts
 * @param lengthSeconds  how long the clip is (0 gives null)
 * @returns the clip, or null when there is nothing to play
 */
export function sliceBuffer(
  context: Pick<BaseAudioContext, "createBuffer">,
  source: AudioBuffer,
  startSeconds: number,
  lengthSeconds: number,
): AudioBuffer | null {
  const startFrame = Math.floor(startSeconds * source.sampleRate);
  const frameCount = Math.min(Math.floor(lengthSeconds * source.sampleRate), source.length - startFrame);
  if (frameCount <= 0) return null;
  const clip = context.createBuffer(source.numberOfChannels, frameCount, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel++) {
    clip.copyToChannel(source.getChannelData(channel).subarray(startFrame, startFrame + frameCount), channel);
  }
  return clip;
}

/** Decode a celebration's sound and cut it to the clip its file name asks for; null if it cannot be played. */
async function prepareClip(files: PackCelebrationFiles, blobs: Map<string, Blob>): Promise<AudioBuffer | null> {
  const sound = files.sound;
  const blob = sound ? blobs.get(sound.name) : undefined;
  if (!sound || !blob) return null;
  try {
    const decoded = await decodeSound(blob);
    const clip = resolveClip(sound, decoded.duration);
    return sliceBuffer(getAudioContext(), decoded, clip.startSeconds, clip.lengthSeconds);
  } catch (error) {
    console.warn(`[Celebration] Pack sound ${sound.name} is not usable:`, error);
    return null;
  }
}

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

/** An object URL for every picture file, by file name. */
function pictureUrlsByName(source: PackFile[]): Map<string, string> {
  const urls = new Map<string, string>();
  for (const entry of source) {
    if (parsePackFileName(entry.name)?.kind === "image") urls.set(entry.name, urlFor(entry.blob));
  }
  return urls;
}

/** Pair the files into celebrations, dropping any with neither a playable sound nor a picture. */
async function buildCelebrations(
  blobs: Map<string, Blob>,
  urlsByName: Map<string, string>,
): Promise<PreparedPackCelebration[]> {
  const prepared: PreparedPackCelebration[] = [];
  for (const pair of pairPackFiles([...blobs.keys()])) {
    const clip = await prepareClip(pair, blobs);
    const imageUrl = pair.image ? (urlsByName.get(pair.image.name) ?? null) : null;
    if (clip !== null || imageUrl !== null) {
      prepared.push({ name: `${PACK_NAME_PREFIX}${pair.baseName}`, clip, imageUrl });
    }
  }
  return prepared;
}

/**
 * Make pack files ready to play, replacing whatever was prepared before.
 * Never rejects.
 * @param files  the pack's files; when omitted they are read from this device's pack database
 */
export async function preparePackCelebrations(files?: PackFile[]): Promise<void> {
  try {
    const source = files ?? (await loadStoredPackFiles());
    releasePackCelebrations();
    const urlsByName = pictureUrlsByName(source);
    celebrations = await buildCelebrations(new Map(source.map((file) => [file.name, file.blob])), urlsByName);
    imageUrls = [...urlsByName.values()];
  } catch (error) {
    console.warn("[Celebration] Could not prepare the pack:", error);
    releasePackCelebrations();
  }
}

/** The prepared pack celebrations, in name order (empty until a pack is on the device). */
export function getPackCelebrations(): PreparedPackCelebration[] {
  return celebrations;
}

/** Every picture in the pack (for a sound with no picture of its own). */
export function getPackImageUrls(): string[] {
  return imageUrls;
}
