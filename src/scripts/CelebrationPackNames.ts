/**
 * How the celebration pack's file names turn into celebrations. Pure (no
 * browser or Vue), so the naming rule is unit tested at its bounds.
 *
 * The rule needs no configuration, only file names:
 * - Files that share a base name are one celebration: tips.mp3 + tips.gif.
 * - A sound's base name may end in "@start" or "@start+length", in seconds:
 *   "tips@12.5+3.mp3" plays 3 seconds from 12.5 s; "tips@12.5.mp3" plays
 *   from 12.5 s for up to the default; "tips.mp3" plays from the start.
 *   The picture stays "tips.gif": the suffix is not part of the base name.
 * - A sound alone plays with a random pack picture, a GIF, or just bills;
 *   a picture alone shows with the app's synthesized sounds.
 * The same rule is documented for the owner in pythonServer's README.
 */

/** Longest clip played when the file name gives no length, and the most any name may ask for. */
export const MAX_PACK_CLIP_SECONDS = 15;

/** The latest start a file name may ask for (an hour in), so a typo cannot ask for nonsense. */
export const MAX_PACK_START_SECONDS = 3600;

export type PackFileKind = "sound" | "image";

export interface PackFileName {
  name: string; // the whole file name, as on the server
  kind: PackFileKind;
  baseName: string; // lower case, without extension or the @start+length suffix
  startSeconds: number; // 0 when the name has no suffix
  lengthSeconds: number | null; // null when the name does not say
}

/** One celebration made from the pack: a sound, a picture, or both. */
export interface PackCelebrationFiles {
  baseName: string;
  sound: PackFileName | null;
  image: PackFileName | null;
}

const SOUND_EXTENSIONS = ["mp3", "m4a", "ogg", "wav"];
const IMAGE_EXTENSIONS = ["gif", "webp", "png", "jpg", "jpeg"];

// "<base>@<start>" or "<base>@<start>+<length>"; start and length are plain decimals.
const CLIP_SUFFIX = /^(.*)@(\d+(?:\.\d+)?)(?:\+(\d+(?:\.\d+)?))?$/;

/** The kind a file extension (lower case, no dot) belongs to, or null if the pack does not use it. */
export function kindOfExtension(extension: string): PackFileKind | null {
  if (SOUND_EXTENSIONS.includes(extension)) return "sound";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  return null;
}

/**
 * Read one file name.
 * - A start past MAX_PACK_START_SECONDS is clamped to it.
 * - A length of 0 means "not given"; a length above MAX_PACK_CLIP_SECONDS is clamped to it.
 * - Only sounds read the "@start+length" suffix; on a picture it stays part of the name.
 * @param name  the file name, for example "tips@12.5+3.mp3"
 * @returns the parsed name, or null when it has no usable extension
 */
export function parsePackFileName(name: string): PackFileName | null {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return null;
  const kind = kindOfExtension(name.slice(dotIndex + 1).toLowerCase());
  if (kind === null) return null;
  const stem = name.slice(0, dotIndex);
  const suffix = kind === "sound" ? CLIP_SUFFIX.exec(stem) : null;
  if (suffix === null) {
    return { name, kind, baseName: stem.toLowerCase(), startSeconds: 0, lengthSeconds: null };
  }
  const startSeconds = Math.min(Number(suffix[2]), MAX_PACK_START_SECONDS);
  const requestedLength = suffix[3] === undefined ? 0 : Number(suffix[3]);
  const lengthSeconds = requestedLength > 0 ? Math.min(requestedLength, MAX_PACK_CLIP_SECONDS) : null;
  return { name, kind, baseName: suffix[1].toLowerCase(), startSeconds, lengthSeconds };
}

/**
 * Group file names into celebrations by shared base name. Names the rule
 * cannot read are ignored. If two files of one kind share a base name
 * (tips.mp3 and tips@2.mp3), the first in name order is used.
 * @param names  the file names in the pack
 * @returns celebrations in base-name order
 */
export function pairPackFiles(names: string[]): PackCelebrationFiles[] {
  const celebrations = new Map<string, PackCelebrationFiles>();
  for (const name of [...names].sort()) {
    const parsed = parsePackFileName(name);
    if (parsed === null) continue;
    const entry = celebrations.get(parsed.baseName) ?? { baseName: parsed.baseName, sound: null, image: null };
    if (parsed.kind === "sound") entry.sound ??= parsed;
    else entry.image ??= parsed;
    celebrations.set(parsed.baseName, entry);
  }
  return [...celebrations.values()].sort((a, b) => a.baseName.localeCompare(b.baseName));
}

/**
 * The part of a sound to play, given how long the decoded sound really is.
 * - No length in the name: from the start to the end of the sound, at most MAX_PACK_CLIP_SECONDS.
 * - A start at or past the end plays nothing (length 0).
 * @param sound  the sound's parsed name
 * @param soundSeconds  the decoded sound's duration
 * @returns where to start and how long to play, in seconds
 */
export function resolveClip(
  sound: Pick<PackFileName, "startSeconds" | "lengthSeconds">,
  soundSeconds: number,
): { startSeconds: number; lengthSeconds: number } {
  const startSeconds = Math.min(sound.startSeconds, soundSeconds);
  const available = soundSeconds - startSeconds;
  const wanted = sound.lengthSeconds ?? MAX_PACK_CLIP_SECONDS;
  return { startSeconds, lengthSeconds: Math.min(wanted, MAX_PACK_CLIP_SECONDS, available) };
}
