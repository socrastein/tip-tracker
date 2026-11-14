import { decodeSound, playClip } from "./CustomCelebrationAudio";
import { getAudioContext, unlockAudioContext } from "./CelebrationSounds";
import { showCelebration } from "./CelebrationState";
import type { CelebrationName } from "./CelebrationRotation";

/**
 * Playing a celebration made of a sound clip and an optional picture, with
 * the falling bills: the "custom celebration" of the pack, used by the phone
 * and, as an identical copy, by the tip console's preview, so the console
 * shows exactly what the phone will.
 *
 * Self-contained on purpose (it imports only the audio and celebration-state
 * modules that are copied with it, never the tip store, backup or router).
 * The files copied to the console are listed in tipConsole's README.
 */

/** The longest clip played, and the most a celebration may ask for (the server caps it the same). */
export const MAX_PACK_CLIP_SECONDS = 15;

const CLIP_EXTRA_MS = 1000; // the picture and bills outlast the clip a little
/** A very short clip, or none, still gets a proper show of this many milliseconds. */
export const MIN_CLIP_CELEBRATION_MS = 4000;

/**
 * The part of a sound to play, given how long the decoded sound really is.
 * The length is capped at MAX_PACK_CLIP_SECONDS and at what is left of the
 * sound after the start; a start at or past the end plays nothing (length 0).
 * @param startSeconds  where the clip starts
 * @param lengthSeconds  how long the clip should be
 * @param soundSeconds  the decoded sound's duration
 */
export function resolveClip(
  startSeconds: number,
  lengthSeconds: number,
  soundSeconds: number,
): { startSeconds: number; lengthSeconds: number } {
  const start = Math.min(Math.max(startSeconds, 0), soundSeconds);
  const available = soundSeconds - start;
  return {
    startSeconds: start,
    lengthSeconds: Math.max(0, Math.min(lengthSeconds, MAX_PACK_CLIP_SECONDS, available)),
  };
}

/**
 * Copy part of a decoded sound into a new, shorter buffer (a few seconds,
 * not the whole song, so memory stays small).
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

/**
 * Decode a sound and cut it to the clip asked for, ready to play at a tap.
 * @returns the clip, or null when the sound cannot be decoded or the start is past its end
 */
export async function prepareClip(sound: Blob, startSeconds: number, lengthSeconds: number): Promise<AudioBuffer | null> {
  try {
    const decoded = await decodeSound(sound);
    const clip = resolveClip(startSeconds, lengthSeconds, decoded.duration);
    return sliceBuffer(getAudioContext(), decoded, clip.startSeconds, clip.lengthSeconds);
  } catch (error) {
    console.warn("[Celebration] A sound is not usable:", error);
    return null;
  }
}

/**
 * Play a prepared clip and show its celebration (picture or GIF, and bills).
 * Call it from inside a tap so sound is allowed. The sound failing never
 * costs the visuals.
 * @param name  the celebration's name
 * @param clip  the prepared clip
 * @param extras  the picture and GIF to show with it
 */
export function playClipCelebration(
  name: CelebrationName,
  clip: AudioBuffer,
  extras: { pictureUrl: string | null; gifUrl: string | null },
): void {
  try {
    playClip(unlockAudioContext(), clip, {
      startSeconds: 0,
      lengthSeconds: clip.duration,
    });
  } catch (error) {
    console.warn("[Celebration] The clip could not start:", error);
  }
  showCelebration(name, {
    ...extras,
    durationMs: Math.max(clip.duration * 1000 + CLIP_EXTRA_MS, MIN_CLIP_CELEBRATION_MS),
  });
}
