import { getAudioContext } from "./CelebrationSounds";

/**
 * Decoding and playing the owner's own sound clip (from the custom
 * celebration slot) with the Web Audio API.
 */

const FADE_OUT_SECONDS = 0.15; // so a clip cut mid-song does not end in a click

/**
 * Decode an audio file into a buffer ready to play. Works on a suspended
 * context, so it can be done ahead of time, before any tap.
 */
export async function decodeSound(sound: Blob): Promise<AudioBuffer> {
  const bytes = await sound.arrayBuffer();
  return getAudioContext().decodeAudioData(bytes);
}

/**
 * Clamp a requested clip to the sound's real length, so a start past the
 * end plays nothing instead of throwing and a length past the end stops there.
 * @returns the offset and length to play, in seconds; length 0 means nothing to play
 */
export function clampClip(
  soundSeconds: number,
  startSeconds: number,
  lengthSeconds: number,
): { offset: number; length: number } {
  const offset = Math.min(Math.max(startSeconds, 0), soundSeconds);
  const length = Math.min(Math.max(lengthSeconds, 0), soundSeconds - offset);
  return { offset, length };
}

/**
 * Play part of a decoded sound, starting now.
 * @param context  an unlocked AudioContext
 * @param buffer  the decoded sound
 * @param requestedClip  where in the sound to start and how long to play, in seconds
 * @returns a function that stops the clip early
 */
export function playClip(
  context: AudioContext,
  buffer: AudioBuffer,
  requestedClip: { startSeconds: number; lengthSeconds: number },
): () => void {
  const clip = clampClip(buffer.duration, requestedClip.startSeconds, requestedClip.lengthSeconds);
  if (clip.length === 0) return () => {};
  const source = context.createBufferSource();
  const envelope = context.createGain();
  const startTime = context.currentTime + 0.02;
  const endTime = startTime + clip.length;
  source.buffer = buffer;
  envelope.gain.setValueAtTime(1, Math.max(startTime, endTime - FADE_OUT_SECONDS));
  envelope.gain.linearRampToValueAtTime(0, endTime);
  source.connect(envelope).connect(context.destination);
  source.start(startTime, clip.offset, clip.length);
  return () => source.stop();
}
