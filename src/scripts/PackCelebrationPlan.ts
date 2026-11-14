import { BUILT_IN_CELEBRATIONS } from "./CelebrationRotation";
import type { PreparedPackCelebration } from "./CelebrationPackRuntime";

/**
 * Decides what a pack celebration shows and sounds like when it lacks a
 * sound or a picture (see planPackCelebration). Pure: the random source is
 * injected so tests are deterministic.
 */

type BuiltInName = (typeof BUILT_IN_CELEBRATIONS)[number];

export interface PackCelebrationPlan {
  pictureUrl: string | null; // a pack picture to sway in the middle, if any
  useGif: boolean; // take the ready GIPHY GIF instead (only when there is no picture)
  builtInSound: BuiltInName | null; // the synthesized sound to play when the pack has no sound
}

/**
 * Plan one pack celebration.
 * - Sound and picture: that sound with that picture.
 * - Sound only: a random choice among every pack picture and, if one is
 *   ready, the GIF; with neither, just the falling bills.
 * - Picture only: that picture with a random built-in celebration's sound.
 * @param celebration  the prepared pack celebration
 * @param packImageUrls  every picture in the pack
 * @param isGifReady  whether a GIPHY GIF is ready to use
 * @param random  returns 0 up to but not including 1
 */
export function planPackCelebration(
  celebration: Pick<PreparedPackCelebration, "clip" | "imageUrl">,
  packImageUrls: string[],
  isGifReady: boolean,
  random: () => number = Math.random,
): PackCelebrationPlan {
  const builtInSound = celebration.clip === null ? pickItem(BUILT_IN_CELEBRATIONS, random) : null;
  if (celebration.imageUrl !== null) return { pictureUrl: celebration.imageUrl, useGif: false, builtInSound };
  const choices: (string | "gif")[] = isGifReady ? [...packImageUrls, "gif"] : [...packImageUrls];
  if (choices.length === 0) return { pictureUrl: null, useGif: false, builtInSound };
  const chosen = pickItem(choices, random);
  return chosen === "gif"
    ? { pictureUrl: null, useGif: true, builtInSound }
    : { pictureUrl: chosen, useGif: false, builtInSound };
}

/** One item of a non-empty list, at random. */
function pickItem<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}
